const { config } = require('./config');
const { logger } = require('./logger');

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_RETRIES = 3;

let requestTimestamps = [];

function pruneOldTimestamps() {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  requestTimestamps = requestTimestamps.filter(t => t > cutoff);
}

async function waitForRateLimit(maxRpm = 28) {
  pruneOldTimestamps();
  while (requestTimestamps.length >= maxRpm) {
    const waitMs = requestTimestamps[0] + RATE_LIMIT_WINDOW_MS - Date.now() + 100;
    logger.debug('groq-client', `Rate limit reached, waiting ${waitMs}ms`);
    await new Promise(r => setTimeout(r, Math.max(waitMs, 500)));
    pruneOldTimestamps();
  }
}

async function chatCompletion({ messages, model, temperature = 0.3, maxTokens = 8192, jsonMode = false }) {
  await waitForRateLimit();

  const useModel = model || config.groq.model;
  const body = {
    model: useModel,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      requestTimestamps.push(Date.now());

      const response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groq.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        const backoff = retryAfter * 1000 * Math.pow(2, attempt);
        logger.warn('groq-client', `Rate limited (429), backing off ${backoff}ms`, { attempt });
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage || {},
        model: data.model,
        finishReason: data.choices?.[0]?.finish_reason,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const backoff = 1000 * Math.pow(2, attempt);
        logger.warn('groq-client', `Request failed, retrying in ${backoff}ms`, { error: err.message });
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  throw lastError;
}

const groqClient = { chatCompletion };

module.exports = { groqClient };
