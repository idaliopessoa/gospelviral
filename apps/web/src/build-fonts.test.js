// @vitest-environment node
// (Vite/esbuild's TextEncoder invariant breaks under the default jsdom env.)
import { describe, it, expect, beforeAll } from 'vitest';
import { build } from 'vite';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * D5 (TASK_019) build-regression guard.
 *
 * The custom display fonts were loaded via a CSS `@import` placed AFTER the
 * `@tailwind` directives in globals.css. A CSS `@import` that does not lead the
 * stylesheet is spec-invalid, so the production Vite build STRIPPED it — the
 * emitted CSS had zero `googleapis`, custom fonts never loaded in prod, and the
 * panel font control had no visible effect.
 *
 * The fix loads the fonts via a `<link rel="stylesheet">` in index.html, which
 * survives the build. This test runs a real production build into a temp dir
 * and asserts BOTH halves of the contract: the emitted HTML references the
 * Google Fonts stylesheet, AND no font `@import` lurks back in the emitted CSS
 * (the exact signature of the bug it guards).
 */
const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('production build font loading (D5)', () => {
  let html = '';
  let css = '';

  beforeAll(async () => {
    // Arrange — build the app to an isolated temp dir (does not touch dist/).
    const outDir = mkdtempSync(join(tmpdir(), 'gv-build-fonts-'));
    await build({
      root: appRoot,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    html = readFileSync(join(outDir, 'index.html'), 'utf8');
    const cssFiles = readdirSync(join(outDir, 'assets')).filter((f) => f.endsWith('.css'));
    css = cssFiles.map((f) => readFileSync(join(outDir, 'assets', f), 'utf8')).join('\n');
  }, 60_000);

  it('emits a Google Fonts <link rel="stylesheet"> in index.html', () => {
    // Act + Assert — the stylesheet link (not merely the preconnect) survives the build.
    expect(html).toMatch(/rel="stylesheet"[^>]*fonts\.googleapis\.com\/css2/);
  });

  it('does not rely on a CSS @import for the fonts (the stripped-@import bug)', () => {
    // Act + Assert — the production CSS must not reference googleapis at all;
    // an @import here is what the build silently dropped before the fix.
    expect(css).not.toContain('googleapis');
  });
});
