const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 600;
const DEFAULT_MAX_TOOL_ROUNDS = 4;

class LlmProviderError extends Error {
  constructor(message = 'The AI study assistant is temporarily unavailable. Please try again later.') {
    super(message);
    this.name = 'LlmProviderError';
    this.status = 503;
  }
}

function getProviderConfig() {
  const provider = String(process.env.LLM_PROVIDER || 'gemini').trim().toLowerCase();
  const apiKey = String(process.env.LLM_API_KEY || '').trim();
  const envModel = String(process.env.LLM_MODEL || '').trim();

  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      apiKey,
      model: envModel || DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (provider === 'gemini') {
    return {
      provider: 'gemini',
      apiKey,
      model: envModel || DEFAULT_GEMINI_MODEL,
    };
  }

  return {
    provider: '',
    apiKey: '',
    model: '',
  };
}

function isAssistantConfigured() {
  const enabledFlag = String(process.env.ASSISTANT_ENABLED || 'false').trim().toLowerCase() === 'true';
  if (!enabledFlag) return false;
  const cfg = getProviderConfig();
  return Boolean(cfg.provider && cfg.apiKey);
}

function toGeminiTools(toolDeclarations) {
  return [
    {
      functionDeclarations: toolDeclarations.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'object', properties: {} },
      })),
    },
  ];
}

function toAnthropicTools(toolDeclarations) {
  return toolDeclarations.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters || { type: 'object', properties: {} },
  }));
}

async function postJson(url, headers, body, signal, fetchFn) {
  let response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new LlmProviderError('The AI study assistant is temporarily unavailable. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new LlmProviderError('The AI study assistant is temporarily unavailable. Please try again later.');
  }

  try {
    return await response.json();
  } catch {
    throw new LlmProviderError('The AI study assistant returned an unexpected response. Please try again.');
  }
}

async function runGeminiLoop({
  apiKey,
  model,
  systemPrompt,
  messages,
  tools,
  executeTool,
  maxTokens,
  maxToolRounds,
  signal,
  fetchFn,
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const geminiTools = toGeminiTools(tools);
  const allowedTools = new Set(tools.map((t) => t.name));

  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallsCount = 0;

  for (let round = 0; round <= maxToolRounds; round++) {
    const includeTools = round < maxToolRounds && geminiTools[0].functionDeclarations.length > 0;
    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.4,
      },
    };
    if (includeTools) {
      payload.tools = geminiTools;
    }

    const data = await postJson(url, headers, payload, signal, fetchFn);
    if (data.usageMetadata) {
      inputTokens += Number(data.usageMetadata.promptTokenCount || 0);
      outputTokens += Number(data.usageMetadata.candidatesTokenCount || 0);
    }

    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];

    const functionCalls = parts
      .filter((p) => p && p.functionCall && typeof p.functionCall.name === 'string')
      .map((p) => p.functionCall);

    if (functionCalls.length > 0 && includeTools) {
      // Preserve candidate.content verbatim (including any thoughtSignature on parts)
      contents.push(candidate.content);

      const responseParts = [];
      for (const fc of functionCalls) {
        toolCallsCount += 1;
        const resultText = allowedTools.has(fc.name)
          ? await executeTool(fc.name)
          : JSON.stringify({ error: 'Tool not permitted' });

        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: resultText },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: responseParts,
      });
      continue;
    }

    const text = parts
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim();

    if (!text) {
      throw new LlmProviderError('The AI study assistant could not generate a response right now. Please try again.');
    }

    return {
      text,
      usage: { inputTokens, outputTokens },
      toolCallsCount,
    };
  }

  throw new LlmProviderError('The AI study assistant could not complete your request. Please try rephrasing your question.');
}

async function runAnthropicLoop({
  apiKey,
  model,
  systemPrompt,
  messages,
  tools,
  executeTool,
  maxTokens,
  maxToolRounds,
  signal,
  fetchFn,
}) {
  const url = 'https://api.anthropic.com/v1/messages';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  const apiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.text,
  }));

  const anthropicTools = toAnthropicTools(tools);
  const allowedTools = new Set(tools.map((t) => t.name));

  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallsCount = 0;

  for (let round = 0; round <= maxToolRounds; round++) {
    const includeTools = round < maxToolRounds && anthropicTools.length > 0;
    const payload = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    };
    if (includeTools) {
      payload.tools = anthropicTools;
    }

    const data = await postJson(url, headers, payload, signal, fetchFn);
    if (data.usage) {
      inputTokens += Number(data.usage.input_tokens || 0);
      outputTokens += Number(data.usage.output_tokens || 0);
    }

    const blocks = Array.isArray(data.content) ? data.content : [];
    const toolUses = blocks.filter((b) => b && b.type === 'tool_use' && typeof b.name === 'string');

    if (toolUses.length > 0 && includeTools) {
      apiMessages.push({
        role: 'assistant',
        content: blocks,
      });

      const toolResults = [];
      for (const tu of toolUses) {
        toolCallsCount += 1;
        const resultText = allowedTools.has(tu.name)
          ? await executeTool(tu.name)
          : JSON.stringify({ error: 'Tool not permitted' });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: String(resultText),
        });
      }

      apiMessages.push({
        role: 'user',
        content: toolResults,
      });
      continue;
    }

    const text = blocks
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!text) {
      throw new LlmProviderError('The AI study assistant could not generate a response right now. Please try again.');
    }

    return {
      text,
      usage: { inputTokens, outputTokens },
      toolCallsCount,
    };
  }

  throw new LlmProviderError('The AI study assistant could not complete your request. Please try rephrasing your question.');
}

/**
 * Runs a single assistant turn with up to `maxToolRounds` tool-call iterations
 * across either Gemini or Anthropic REST APIs using plain fetch.
 */
async function runAssistantChat({
  systemPrompt,
  messages,
  tools,
  executeTool,
  maxTokens = DEFAULT_MAX_TOKENS,
  maxToolRounds = DEFAULT_MAX_TOOL_ROUNDS,
  signal,
  fetchFn = globalThis.fetch,
}) {
  const cfg = getProviderConfig();
  if (!isAssistantConfigured()) {
    throw new LlmProviderError('The AI study assistant is currently disabled.');
  }
  if (typeof fetchFn !== 'function') {
    throw new LlmProviderError('HTTP client unavailable.');
  }

  if (cfg.provider === 'anthropic') {
    return runAnthropicLoop({
      apiKey: cfg.apiKey,
      model: cfg.model,
      systemPrompt,
      messages,
      tools,
      executeTool,
      maxTokens,
      maxToolRounds,
      signal,
      fetchFn,
    });
  }

  return runGeminiLoop({
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt,
    messages,
    tools,
    executeTool,
    maxTokens,
    maxToolRounds,
    signal,
    fetchFn,
  });
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MAX_TOOL_ROUNDS,
  LlmProviderError,
  getProviderConfig,
  isAssistantConfigured,
  runAssistantChat,
};
