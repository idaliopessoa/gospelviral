import { parseAnalysisResponse } from '@gospelviral/shared';
import { env } from '../config/env.js';
import { AdapterConfigError, AdapterTransportError } from './errors.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 8000;

function extractText(data) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function describeStatus(status) {
  if (status === 401 || status === 403) return { code: 'http_auth', message: 'Anthropic API rejected the credentials.' };
  if (status === 429) return { code: 'http_rate_limit', message: 'Anthropic API rate limit hit.' };
  if (status >= 500) return { code: 'http_5xx', message: 'Anthropic API server error.' };
  return { code: 'http_4xx', message: 'Anthropic API request rejected.' };
}

/**
 * @param {{
 *   systemPrompt: string,
 *   userMessage: string,
 *   modelId: string,
 *   maxTokens?: number,
 *   signal?: AbortSignal,
 *   apiKey?: string,
 *   fetchImpl?: typeof fetch,
 * }} options
 * @returns {Promise<import('@gospelviral/shared').AnalysisResponse>}
 */
export async function runViaApi({
  systemPrompt,
  userMessage,
  modelId,
  maxTokens = DEFAULT_MAX_TOKENS,
  signal,
  apiKey = env.apiKey,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    throw new AdapterConfigError(
      'missing_api_key',
      'ANTHROPIC_API_KEY is not set; the API adapter cannot run.',
    );
  }

  const body = {
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  let response;
  try {
    response = await fetchImpl(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new AdapterTransportError(
      'network',
      'Network error while reaching the Anthropic API.',
      { retryable: true },
    );
  }

  if (!response.ok) {
    const { code, message } = describeStatus(response.status);
    throw new AdapterTransportError(code, message, {
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  const data = await response.json();
  const text = extractText(data);
  return parseAnalysisResponse(text);
}
