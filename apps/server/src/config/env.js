/**
 * Single seam to `process.env`. No other module in the server may read from
 * `process.env` directly — convention enforced by code review + grep
 * (`apps/server/src` should match `process\.env` only inside this file).
 *
 * `readEnv()` re-reads `process.env` on every call so tests can vary the
 * shell environment between assertions. `env` is the snapshot taken at
 * module load.
 */

import { isAbsolute, resolve } from 'node:path';
import { VIDEO_MIME_ALLOWLIST_DEFAULT } from '@gospelviral/shared';

const DEFAULT_PORT = 8787;
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_ANALYZE_TIMEOUT_MS = 120_000;
const DEFAULT_VIDEO_UPLOAD_DIR_REL = 'apps/server/.tmp/video-uploads';
const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 2_147_483_648; // 2 GiB

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

function parseVideoUploadDir(raw) {
  if (raw === undefined || raw === '') {
    return resolve(process.cwd(), DEFAULT_VIDEO_UPLOAD_DIR_REL);
  }
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

function parseMaxUploadSizeBytes(raw) {
  if (raw === undefined || raw === '') return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_UPLOAD_SIZE_BYTES;
}

function parseVideoAllowedMimes(raw) {
  if (raw === undefined || raw === '') {
    return new Set(VIDEO_MIME_ALLOWLIST_DEFAULT);
  }
  const entries = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return new Set(entries);
}

/**
 * @typedef {Object} ServerEnv
 * @property {string|undefined} apiKey      ANTHROPIC_API_KEY or undefined
 * @property {number} port                  defaults to 8787
 * @property {'debug'|'info'|'warn'|'error'} logLevel
 * @property {number} analyzeTimeoutMs
 * @property {string} videoUploadDir        absolute path; defaults to <cwd>/apps/server/.tmp/video-uploads
 * @property {number} maxUploadSizeBytes    defaults to 2 GiB (2_147_483_648)
 * @property {Set<string>} videoAllowedMimes mime allowlist for uploads
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
    videoUploadDir: parseVideoUploadDir(process.env.VIDEO_UPLOAD_DIR),
    maxUploadSizeBytes: parseMaxUploadSizeBytes(process.env.MAX_UPLOAD_SIZE_BYTES),
    videoAllowedMimes: parseVideoAllowedMimes(process.env.VIDEO_ALLOWED_MIMES),
  };
}

export const env = readEnv();
