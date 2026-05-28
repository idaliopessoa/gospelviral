/**
 * Single seam to `process.env`. No other module in the server may read from
 * `process.env` directly — convention enforced by code review + grep
 * (`apps/server/src` should match `process\.env` only inside this file).
 *
 * `readEnv()` re-reads `process.env` on every call so tests can vary the
 * shell environment between assertions. `env` is the snapshot taken at
 * module load.
 */

const DEFAULT_PORT = 8787;
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_ANALYZE_TIMEOUT_MS = 120_000;

function parsePort(raw) {
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 65_536 ? n : DEFAULT_PORT;
}

function parseLogLevel(raw) {
  const allowed = new Set(['debug', 'info', 'warn', 'error']);
  return allowed.has(raw) ? raw : DEFAULT_LOG_LEVEL;
}

function parseTimeout(raw) {
  if (raw === undefined || raw === '') return DEFAULT_ANALYZE_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ANALYZE_TIMEOUT_MS;
}

function readApiKey() {
  const v = process.env.ANTHROPIC_API_KEY;
  if (typeof v !== 'string' || v.length === 0) return undefined;
  return v;
}

/**
 * @typedef {Object} ServerEnv
 * @property {string|undefined} apiKey      ANTHROPIC_API_KEY or undefined
 * @property {number} port                  defaults to 8787
 * @property {'debug'|'info'|'warn'|'error'} logLevel
 * @property {number} analyzeTimeoutMs
 */

/**
 * @returns {ServerEnv}
 */
export function readEnv() {
  return {
    apiKey: readApiKey(),
    port: parsePort(process.env.PORT),
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    analyzeTimeoutMs: parseTimeout(process.env.ANALYZE_TIMEOUT_MS),
  };
}

export const env = readEnv();
