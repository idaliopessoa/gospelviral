#!/usr/bin/env node
/**
 * Hand-driven smoke against the real Anthropic API.
 *
 * **Not run by CI, not part of `pnpm test`.** The human runs this manually
 * after editing `.env.local` with a real `ANTHROPIC_API_KEY`. It bills the
 * account, so a `--yes` flag is required to proceed.
 *
 * Usage:
 *   pnpm -F @gospelviral/server smoke:api --yes
 */
import {
  EXAMPLE_TRANSCRIPT,
  OPTIMIZED_PROMPT,
} from '@gospelviral/shared';
import { runViaApi } from '../src/runtime/claude-api.js';
import { resolveModel } from '../src/config/models.js';
import { env } from '../src/config/env.js';
import { createLogger } from '../src/lib/logger.js';

const logger = createLogger({ level: env.logLevel, baseCtx: { scope: 'smoke:api' } });

const args = new Set(process.argv.slice(2));

if (!args.has('--yes')) {
  logger.error(
    'Refusing to run without --yes. This script bills the Anthropic account.',
  );
  process.exit(2);
}

if (!env.apiKey) {
  logger.error('ANTHROPIC_API_KEY is not set in .env.local. Aborting.');
  process.exit(3);
}

const userMessage = `<transcript>\n${EXAMPLE_TRANSCRIPT}\n</transcript>\n\nExecute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.`;

try {
  const out = await runViaApi({
    systemPrompt: OPTIMIZED_PROMPT,
    userMessage,
    modelId: resolveModel('fast', logger),
  });
  logger.info('smoke ok', {
    moments: out.top_moments.length,
    rank1: out.top_moments[0]?.hook_title,
  });
  process.exit(0);
} catch (err) {
  logger.error('smoke failed', { code: err?.code, name: err?.name, msg: err?.message });
  process.exit(1);
}
