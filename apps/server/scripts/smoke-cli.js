#!/usr/bin/env node
/**
 * Hand-driven smoke against the local `claude` CLI binary.
 *
 * Not run by CI, not part of `pnpm test`. The human runs this manually to
 * confirm the stream-json event sequence still matches the parser
 * expectations. The captured fixture lives at
 * `apps/server/src/parsers/__fixtures__/smoke-events.jsonl`.
 *
 * Usage:
 *   pnpm -F @gospelviral/server smoke:cli --yes
 */
import { execSync } from 'node:child_process';
import {
  EXAMPLE_TRANSCRIPT,
  OPTIMIZED_PROMPT,
} from '@gospelviral/shared';
import { runViaCli } from '../src/runtime/claude-cli.js';
import { resolveModel } from '../src/config/models.js';
import { createLogger } from '../src/lib/logger.js';

const logger = createLogger({ baseCtx: { scope: 'smoke:cli' } });
const args = new Set(process.argv.slice(2));

if (!args.has('--yes')) {
  logger.error('Refusing to run without --yes. This script bills the Claude Code account.');
  process.exit(2);
}

let binPath;
try {
  binPath = execSync('which claude').toString().trim();
} catch {
  logger.error('claude binary not found on PATH.');
  process.exit(3);
}

const userMessage = `<transcript>\n${EXAMPLE_TRANSCRIPT}\n</transcript>\n\nExecute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.`;

try {
  const out = await runViaCli({
    systemPrompt: OPTIMIZED_PROMPT,
    userMessage,
    modelId: resolveModel('debug', logger),
    binPath,
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
