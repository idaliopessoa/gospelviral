import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Architectural invariant: the streaming upload pipeline NEVER buffers a
 * whole request body in memory. Hono's `c.req.parseBody()` reads the entire
 * multipart body into memory before returning — using it anywhere in the
 * server would silently break the O(KB)-residency contract proven by
 * `pnpm smoke:heap`.
 *
 * This test greps the server source tree for the substring `parseBody` and
 * fails on any match outside the whitelist. Same enforcement style as other
 * grep-able invariants: a regression trips the suite immediately, no reliance
 * on a reviewer's memory or a manual pre-merge check.
 *
 * Whitelist is currently EMPTY. If a future task has a legitimate reason to
 * call `parseBody` (e.g. a tiny JSON-only endpoint where buffering is fine),
 * add the relative path here WITH a comment explaining why the streaming
 * invariant does not apply to it.
 */
const PARSE_BODY_WHITELIST = new Set([
  // (empty) — no server file may call parseBody. Add "relative/path.js" + reason if ever needed.
]);

const NEEDLE = ['parse', 'Body'].join(''); // split so this file never self-matches

async function collectJsFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectJsFiles(full)));
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

describe('server invariants', () => {
  it('no source file calls parseBody (streaming-upload invariant)', async () => {
    // Arrange
    const files = await collectJsFiles(SRC_DIR);

    // Act — find every non-test source file containing the forbidden call
    const offenders = [];
    for (const file of files) {
      const contents = await readFile(file, 'utf-8');
      if (!contents.includes(NEEDLE)) continue;
      const rel = file.slice(SRC_DIR.length + 1);
      if (!PARSE_BODY_WHITELIST.has(rel)) offenders.push(rel);
    }

    // Assert
    expect(offenders).toEqual([]);
  });
});
