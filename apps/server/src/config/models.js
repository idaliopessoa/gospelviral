/**
 * Canonical Anthropic model slugs for the Viral Cristão server.
 * Verified against Anthropic documentation (Claude Opus 4.7 / Sonnet 4.6 /
 * Haiku 4.5) — if slugs change upstream, this is the single file to edit.
 */
export const MODEL_SLUGS = Object.freeze({
  default: 'claude-opus-4-7',
  fast: 'claude-sonnet-4-6',
  debug: 'claude-haiku-4-5-20251001',
});

const ALLOWED_PREFERENCES = Object.freeze(['default', 'fast', 'debug']);

/**
 * Map a user-facing preference label to the Anthropic wire-format slug.
 * Unknown preferences fall back to default and emit a warning via the
 * optional logger argument. Never throws.
 *
 * @param {'default'|'fast'|'debug'|string} preference
 * @param {{ warn?: (msg: string, ctx?: Record<string, unknown>) => void }} [logger]
 * @returns {string} wire-format model slug
 */
export function resolveModel(preference, logger) {
  if (ALLOWED_PREFERENCES.includes(preference)) {
    return MODEL_SLUGS[preference];
  }
  logger?.warn?.('Unknown model preference; falling back to default.', {
    preference,
    fallback: MODEL_SLUGS.default,
  });
  return MODEL_SLUGS.default;
}
