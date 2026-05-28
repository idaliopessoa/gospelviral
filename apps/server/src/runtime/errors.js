/**
 * Typed errors shared by the API and CLI adapters.
 *
 * The `AnalysisResponseError` from `@gospelviral/shared` is re-thrown
 * unchanged from the parser — adapters do NOT wrap it.
 *
 * Error messages must never contain payload bytes, API key fragments, or
 * any field the user did not already see. The HTTP status mapping for the
 * route layer happens in TASK_009, not here.
 */

export class AdapterConfigError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'AdapterConfigError';
    this.code = code;
  }
}

export class AdapterTransportError extends Error {
  /**
   * @param {string} code     e.g. 'http_401', 'http_5xx', 'network'
   * @param {string} message  sanitized; no key bytes, no body excerpts
   * @param {{ status?: number, retryable?: boolean }} [meta]
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'AdapterTransportError';
    this.code = code;
    this.status = meta.status;
    this.retryable = meta.retryable ?? false;
  }
}

export class AdapterTimeoutError extends Error {
  /**
   * @param {number} timeoutMs
   */
  constructor(timeoutMs) {
    super(`Adapter call exceeded ${timeoutMs} ms.`);
    this.name = 'AdapterTimeoutError';
    this.code = 'timeout';
    this.timeoutMs = timeoutMs;
  }
}
