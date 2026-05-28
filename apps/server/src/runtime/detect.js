import which from 'which';
import { env } from '../config/env.js';

const DEFAULT_BIN_CANDIDATES = ['claude', 'openclaude'];
const DEFAULT_TTL_MS = 60_000;
const cache = new Map();

/**
 * @typedef {Object} CliStatus
 * @property {boolean} available
 * @property {string}  [binPath]   absolute path when available
 * @property {string}  [name]      original candidate name (e.g. 'claude')
 */

/**
 * @typedef {Object} RuntimeStatus
 * @property {CliStatus} cli
 * @property {boolean}   apiKey       only reports presence; never the value
 * @property {'cli'|'api'|'none'} recommended
 */

async function findFirstOnPath(candidates, whichImpl) {
  for (const name of candidates) {
    try {
      const binPath = await whichImpl(name);
      if (binPath) return { available: true, binPath, name };
    } catch {
      // not found; keep trying
    }
  }
  return { available: false };
}

function pickRecommended(cli, hasApiKey) {
  if (cli.available) return 'cli';
  if (hasApiKey) return 'api';
  return 'none';
}

/**
 * Report which execution modes are available on this machine.
 *
 * @param {{
 *   binCandidates?: string[],
 *   ttlMs?: number,
 *   whichImpl?: typeof which,
 *   apiKey?: string|undefined,
 * }} [opts]
 * @returns {Promise<RuntimeStatus>}
 */
export async function detectRuntime(opts = {}) {
  const binCandidates = opts.binCandidates ?? DEFAULT_BIN_CANDIDATES;
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const whichImpl = opts.whichImpl ?? which;
  const apiKey = opts.apiKey === undefined ? env.apiKey : opts.apiKey;

  const cacheKey = binCandidates.join('|');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return refreshApiKey(cached.result, apiKey);
  }

  const cli = await findFirstOnPath(binCandidates, whichImpl);
  const hasApiKey = Boolean(apiKey);
  const result = {
    cli,
    apiKey: hasApiKey,
    recommended: pickRecommended(cli, hasApiKey),
  };

  cache.set(cacheKey, { result, expiresAt: Date.now() + ttlMs });
  return result;
}

function refreshApiKey(cachedResult, apiKey) {
  const hasApiKey = Boolean(apiKey);
  if (cachedResult.apiKey === hasApiKey) return cachedResult;
  // env may have changed in-process; reflect it without re-walking PATH.
  return {
    ...cachedResult,
    apiKey: hasApiKey,
    recommended: pickRecommended(cachedResult.cli, hasApiKey),
  };
}

export function clearDetectionCache() {
  cache.clear();
}
