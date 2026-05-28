import {
  ANALYSIS_RESPONSE_REQUIRED_KEYS,
  TOP_MOMENTS_COUNT,
} from './types.js';

/**
 * Typed error thrown by parseAnalysisResponse.
 * The message is intentionally generic — payload content must never leak into logs.
 */
export class AnalysisResponseError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'AnalysisResponseError';
    this.code = code;
  }
}

const FENCE_RE = /```(?:json)?\s*/gi;

function stripFences(text) {
  return text.replace(FENCE_RE, '').replace(/```\s*/g, '').trim();
}

function sliceBraces(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) {
    throw new AnalysisResponseError(
      'no_json_braces',
      'No JSON object found in analysis response.',
    );
  }
  return text.substring(first, last + 1);
}

function parseJsonOrThrow(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new AnalysisResponseError('invalid_json', 'Response is not valid JSON.');
  }
}

function assertRequiredKeys(obj) {
  for (const key of ANALYSIS_RESPONSE_REQUIRED_KEYS) {
    if (!(key in obj)) {
      throw new AnalysisResponseError(
        `missing_${key}`,
        `Required key "${key}" is missing from the analysis response.`,
      );
    }
  }
}

/**
 * Parse a raw model response into a canonical AnalysisResponse.
 *
 * - Accepts ```json fenced or unfenced JSON
 * - Slices from the first `{` to the last `}` before JSON.parse
 * - Validates required top-level keys: metadata, analysis_summary, top_moments
 * - Slices top_moments to exactly 5 entries
 *
 * @param {string} text raw LLM output
 * @returns {import('./types.js').AnalysisResponse}
 */
export function parseAnalysisResponse(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new AnalysisResponseError('empty_input', 'Empty response text.');
  }

  const sliced = sliceBraces(stripFences(text));
  const parsed = parseJsonOrThrow(sliced);

  assertRequiredKeys(parsed);

  if (!Array.isArray(parsed.top_moments)) {
    throw new AnalysisResponseError(
      'top_moments_not_array',
      'top_moments must be an array.',
    );
  }

  parsed.top_moments = parsed.top_moments.slice(0, TOP_MOMENTS_COUNT);

  return parsed;
}
