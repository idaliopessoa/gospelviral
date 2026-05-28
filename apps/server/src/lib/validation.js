const ALLOWED_MODES = new Set(['cli', 'api', 'auto']);
const ALLOWED_MODELS = new Set(['default', 'fast', 'debug']);
const TIMESTAMP_RE = /\d{1,2}:\d{2}/;

/**
 * @typedef {Object} ValidatedAnalyzeBody
 * @property {string} url
 * @property {string} transcript
 * @property {'cli'|'api'|'auto'} mode    defaults to 'auto'
 * @property {'default'|'fast'|'debug'} model  defaults to 'default'
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} code
 * @property {string} message
 */

/**
 * Validate an `/api/analyze` request body.
 *
 * @param {unknown} body
 * @returns {{ ok: true, body: ValidatedAnalyzeBody } | { ok: false, error: ValidationError }}
 */
export function validateAnalyzeBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return fail('invalid_body', 'Request body must be a JSON object.');
  }
  const { url, transcript, mode, model } = body;

  if (typeof url !== 'string' || url.trim().length === 0) {
    return fail('invalid_url', 'A YouTube URL is required.');
  }
  if (typeof transcript !== 'string' || transcript.trim().length === 0) {
    return fail('invalid_transcript', 'A transcript is required.');
  }
  if (!TIMESTAMP_RE.test(transcript)) {
    return fail(
      'transcript_missing_timestamps',
      'Transcript must include MM:SS timestamps.',
    );
  }

  const resolvedMode = mode === undefined ? 'auto' : mode;
  if (typeof resolvedMode !== 'string' || !ALLOWED_MODES.has(resolvedMode)) {
    return fail('invalid_mode', 'mode must be one of "cli", "api", "auto".');
  }

  const resolvedModel = model === undefined ? 'default' : model;
  if (typeof resolvedModel !== 'string' || !ALLOWED_MODELS.has(resolvedModel)) {
    return fail('invalid_model', 'model must be one of "default", "fast", "debug".');
  }

  return {
    ok: true,
    body: {
      url: url.trim(),
      transcript,
      mode: resolvedMode,
      model: resolvedModel,
    },
  };
}

function fail(code, message) {
  return { ok: false, error: { code, message } };
}
