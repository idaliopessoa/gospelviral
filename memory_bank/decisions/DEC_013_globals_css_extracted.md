# DEC_013: Global styles live in `apps/web/src/styles/globals.css` (extracted from the artifact's inline `<style>`)

Date: 2026-05-28
Status: Accepted

## Decision
The artifact's inline `<style>` block (Google Fonts `@import`, body font, the
`.canvas-9-16` / `.video-16-9` / `.canvas-width-only` rules + 768px media
query, and the `details > summary::-webkit-details-marker` reset) is moved
verbatim to `apps/web/src/styles/globals.css`. `apps/web/src/main.jsx`
imports it.

The comment from the artifact ("dimensões fixas do canvas (CSS puro pra
escapar de qualquer issue com Tailwind arbitrary values)") is preserved in
the CSS file so the architectural rationale travels with the rules.

## Why
- Single source for global styles, separate from React component code.
- Vite resolves `.css` imports via PostCSS + Tailwind pipeline, so
  `@tailwind base / components / utilities` directives sit alongside the
  artifact's hand-written rules.
- Keeping the CSS-puro fallback for canvas dimensions is defense-in-depth
  per the architecture lens — Tailwind JIT can compile arbitrary classes in
  Vite, but the artifact's `<style>` block already proved the explicit
  classes work in every browser engine the project targets.

## Consequences
- `index.html` no longer needs the `<link>` to Google Fonts; the `@import` in
  CSS is the single load point. The `<link rel="preconnect">` hints remain
  for handshake speed.
- A future move to `<link rel="preload">` for the fonts (to unblock first
  paint) is a ROADMAP optimization.
