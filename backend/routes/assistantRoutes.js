const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const {
  LlmProviderError,
  isAssistantConfigured,
  runAssistantChat,
} = require('../services/assistant/llmClient');
const {
  TOOL_DECLARATIONS,
  createStudentToolRunner,
} = require('../services/assistant/tools');
const { buildSystemPrompt } = require('../services/assistant/systemPrompt');

const OVERALL_TIMEOUT_MS = 25 * 1000;
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_ITEMS = 10;
const MAX_HISTORY_TEXT_CHARS = 1000;

function parsePositiveInt(rawVal, fallback) {
  const parsed = parseInt(rawVal, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Per-user sliding window limiter following the createSimpleLimiter pattern,
 * keyed strictly by authenticated userId.
 */
function createUserLimiter({ windowMs, getMaxAttempts, name, message }) {
  const store = new Map();

  function limiter(req, res, next) {
    const userId = req.user && req.user.id !== undefined ? String(req.user.id) : null;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const key = userId;
    const now = Date.now();
    const maxAttempts = typeof getMaxAttempts === 'function' ? getMaxAttempts() : getMaxAttempts;

    let timestamps = store.get(key) || [];
    timestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (timestamps.length >= maxAttempts) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: message || `Too many requests for ${name}. Please try again later.`,
        retryAfter: retryAfterSeconds,
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    next();
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const active = timestamps.filter((ts) => now - ts < windowMs);
      if (active.length === 0) {
        store.delete(key);
      } else {
        store.set(key, active);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();

  limiter.resetAll = () => store.clear();
  return limiter;
}

/**
 * Strict student-only guard.
 * Note: middleware/auth.js grants admin access regardless of the roles array,
 * so this guard enforces that teachers AND admins receive 403 on assistant /chat.
 */
function requireStrictStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access forbidden. The AI Study Assistant is available to students only.',
    });
  }
  next();
}

/**
 * Validates POST /api/assistant/chat request payload.
 * Rejects non-string/empty/overlong messages, >10 history turns,
 * disallowed roles (system/tool/model/etc.), or unexpected fields.
 */
function validateChatPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body.' };
  }

  const { message, history } = body;

  if (typeof message !== 'string') {
    return { error: 'Message must be a text string.' };
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 1 || trimmedMessage.length > MAX_MESSAGE_CHARS) {
    return { error: `Message must be between 1 and ${MAX_MESSAGE_CHARS} characters.` };
  }

  let validatedHistory = [];
  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return { error: 'History must be an array.' };
    }
    if (history.length > MAX_HISTORY_ITEMS) {
      return { error: `History cannot exceed ${MAX_HISTORY_ITEMS} messages.` };
    }

    validatedHistory = [];
    for (const item of history) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { error: 'Each history item must be an object with role and text.' };
      }

      const keys = Object.keys(item);
      if (!keys.every((k) => k === 'role' || k === 'text')) {
        return { error: 'History items may only contain role and text fields.' };
      }

      if (item.role !== 'user' && item.role !== 'assistant') {
        return { error: 'History role must be "user" or "assistant".' };
      }

      if (typeof item.text !== 'string') {
        return { error: 'History text must be a string.' };
      }

      const trimmedItemText = item.text.trim();
      if (trimmedItemText.length < 1 || item.text.length > MAX_HISTORY_TEXT_CHARS) {
        return { error: `History text must be between 1 and ${MAX_HISTORY_TEXT_CHARS} characters.` };
      }

      validatedHistory.push({
        role: item.role,
        text: trimmedItemText,
      });
    }
  }

  return {
    message: trimmedMessage,
    history: validatedHistory,
  };
}

function logAssistantMeta({ userId, inputTokens = 0, outputTokens = 0, status }) {
  // Privacy rule: log ONLY userId, timestamp, token counts, and status.
  console.log(
    JSON.stringify({
      event: 'assistant_chat',
      userId,
      timestamp: new Date().toISOString(),
      inputTokens,
      outputTokens,
      status,
    })
  );
}

function createAssistantRouter({ dbClient = db, fetchFn = globalThis.fetch } = {}) {
  const router = express.Router();

  const hourlyLimiter = createUserLimiter({
    windowMs: 60 * 60 * 1000,
    getMaxAttempts: () => parsePositiveInt(process.env.ASSISTANT_HOURLY_LIMIT, 20),
    name: 'assistant-hourly',
    message: 'Hourly AI assistant message limit reached. Please try again later.',
  });

  const dailyLimiter = createUserLimiter({
    windowMs: 24 * 60 * 60 * 1000,
    getMaxAttempts: () => parsePositiveInt(process.env.ASSISTANT_DAILY_LIMIT, 80),
    name: 'assistant-daily',
    message: 'Daily AI assistant message limit reached. Please try again tomorrow.',
  });

  router.get('/status', auth(['student']), (req, res) => {
    return res.status(200).json({
      enabled: isAssistantConfigured(),
    });
  });

  router.post(
    '/chat',
    auth(['student']),
    requireStrictStudent,
    (req, res, next) => {
      if (!isAssistantConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'AI Study Assistant is currently unavailable.',
        });
      }
      const validated = validateChatPayload(req.body);
      if (validated.error) {
        return res.status(400).json({
          success: false,
          message: validated.error,
        });
      }
      req.validatedAssistantPayload = validated;
      next();
    },
    hourlyLimiter,
    dailyLimiter,
    async (req, res) => {
      const validated = req.validatedAssistantPayload;

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);

      try {
        const toolRunner = await createStudentToolRunner(req.user.id, dbClient);
        const systemPrompt = buildSystemPrompt();
        const messages = [
          ...validated.history,
          { role: 'user', text: validated.message },
        ];

        const result = await runAssistantChat({
          systemPrompt,
          messages,
          tools: TOOL_DECLARATIONS,
          executeTool: toolRunner.executeTool,
          maxTokens: 600,
          maxToolRounds: 4,
          signal: controller.signal,
          fetchFn,
        });

        logAssistantMeta({
          userId: req.user.id,
          inputTokens: result.usage?.inputTokens || 0,
          outputTokens: result.usage?.outputTokens || 0,
          status: 200,
        });

        return res.status(200).json({
          success: true,
          reply: result.text,
        });
      } catch (err) {
        if (err instanceof LlmProviderError || err.name === 'AbortError') {
          logAssistantMeta({
            userId: req.user.id,
            status: 503,
          });
          return res.status(503).json({
            success: false,
            message: 'The AI study assistant is temporarily unavailable. Please try again later.',
          });
        }

        logAssistantMeta({
          userId: req.user.id,
          status: 500,
        });
        return res.status(500).json({
          success: false,
          message: 'Something went wrong while processing your request.',
        });
      } finally {
        clearTimeout(timeoutHandle);
      }
    }
  );

  router.resetRateLimiters = () => {
    hourlyLimiter.resetAll();
    dailyLimiter.resetAll();
  };

  return router;
}

const defaultRouter = createAssistantRouter();

module.exports = defaultRouter;
module.exports.createAssistantRouter = createAssistantRouter;
module.exports.createUserLimiter = createUserLimiter;
module.exports.validateChatPayload = validateChatPayload;
module.exports.requireStrictStudent = requireStrictStudent;
