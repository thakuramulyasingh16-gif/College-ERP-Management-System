/**
 * CAPTCHA Middleware
 *
 * Server-side image CAPTCHA using svg-captcha.
 * - Answers are NEVER sent to the client.
 * - Single-use: verifyAndConsume() deletes entry first, then compares.
 * - TTL: 120 seconds.
 * - Hard cap: 5000 entries (evicts oldest).
 * - Periodic cleanup via setInterval(..).unref()
 */

const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');

// ─── In-memory store ───────────────────────────────────────────────────────────
// Map<captchaId, { answer: string, expiresAt: number }>
const captchaStore = new Map();

const TTL_MS = 120 * 1000;      // 2 minutes
const MAX_ENTRIES = 5000;

// Characters that are unambiguous (exclude 0 O o 1 l I i)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

// Periodic cleanup – unref so it doesn't block process exit
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of captchaStore.entries()) {
    if (now >= entry.expiresAt) {
      captchaStore.delete(id);
    }
  }
}, 60 * 1000); // every minute
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Evict oldest entries when at hard cap.
 */
function evictOldest() {
  if (captchaStore.size < MAX_ENTRIES) return;
  // Map iteration order is insertion order; delete first inserted
  const firstKey = captchaStore.keys().next().value;
  if (firstKey !== undefined) {
    captchaStore.delete(firstKey);
  }
}

// ─── Randomised style presets ──────────────────────────────────────────────────
const PRESETS = [
  // Preset A: wavy warp, mixed colours
  {
    noise: 2,
    color: true,
    background: '#f5f5f0',
    width: 160,
    height: 56,
    fontSize: 42,
    charPreset: SAFE_CHARS,
  },
  // Preset B: line-grid overlay, dark on light
  {
    noise: 3,
    color: false,
    background: '#ece9e4',
    width: 160,
    height: 56,
    fontSize: 40,
    charPreset: SAFE_CHARS,
  },
  // Preset C: speckled background, vivid colours
  {
    noise: 4,
    color: true,
    background: '#eef0f4',
    width: 160,
    height: 56,
    fontSize: 44,
    charPreset: SAFE_CHARS,
  },
  // Preset D: minimal noise, bold monochrome
  {
    noise: 2,
    color: false,
    background: '#f8f7f2',
    width: 160,
    height: 56,
    fontSize: 42,
    charPreset: SAFE_CHARS,
  },
];

function randomPreset() {
  return PRESETS[Math.floor(Math.random() * PRESETS.length)];
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a new CAPTCHA.
 * Returns { captchaId, svg }
 * The answer is stored server-side only.
 */
function createCaptcha() {
  evictOldest();

  const preset = randomPreset();
  const captcha = svgCaptcha.create({
    size: 5,
    ...preset,
    ignoreChars: '0Oo1lIi',  // extra safety
  });

  const captchaId = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + TTL_MS;

  // Store ONLY the lowercased answer – never expose it
  captchaStore.set(captchaId, {
    answer: captcha.text.toLowerCase(),
    expiresAt,
  });

  return { captchaId, svg: captcha.data };
}

/**
 * Verify and consume a CAPTCHA answer (single-use).
 * - Deletes the entry FIRST (prevents replay whether right or wrong).
 * - Returns true only if the answer matches and the entry wasn't expired.
 */
function verifyAndConsume(captchaId, answer) {
  if (!captchaId || !answer) return false;

  const entry = captchaStore.get(captchaId);
  captchaStore.delete(captchaId); // consume immediately

  if (!entry) return false;                            // missing or already used
  if (Date.now() >= entry.expiresAt) return false;     // expired

  return entry.answer === String(answer).toLowerCase().trim();
}

/**
 * Delete a specific captcha (used when client reloads).
 */
function deleteCaptcha(captchaId) {
  if (captchaId) captchaStore.delete(captchaId);
}

/**
 * Express middleware: verifyAndConsume from req.body.
 * On failure responds 400 { success:false, code:"CAPTCHA_FAILED", message:... }
 * On success calls next().
 *
 * Skipped entirely when CAPTCHA_ENABLED=false (for existing tests).
 */
function verifyCaptchaMiddleware(req, res, next) {
  if (process.env.CAPTCHA_ENABLED === 'false') {
    return next();
  }

  const { captchaId, captchaAnswer } = req.body;
  const ok = verifyAndConsume(captchaId, captchaAnswer);

  if (!ok) {
    return res.status(400).json({
      success: false,
      code: 'CAPTCHA_FAILED',
      message: 'Incorrect or expired captcha. Please try again.',
    });
  }

  next();
}

// ─── Test-only helper ──────────────────────────────────────────────────────────
// NEVER use in production code – only readable when NODE_ENV === 'test'
function _testOnly_getAnswer(captchaId) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('_testOnly_getAnswer is only available in NODE_ENV=test');
  }
  const entry = captchaStore.get(captchaId);
  return entry ? entry.answer : null;
}

module.exports = {
  createCaptcha,
  verifyAndConsume,
  deleteCaptcha,
  verifyCaptchaMiddleware,
  _testOnly_getAnswer,
  // Expose store size for tests
  _testOnly_storeSize: () => captchaStore.size,
  _testOnly_resetStore: () => captchaStore.clear(),
};
