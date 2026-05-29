# Findings B — Subtitle render & panel SSOT (D3 + D5)

> Persisted by the parent (subagent Write was blocked). Persona: 01-Systems-Architecture-Expert.

## D3 root + recommendation
**Root (code-confirmed):** Panel is SSOT for on-screen text shape (`subtitleConfig.charsPerScreen`, `.lines`). Pre-TASK_018 the artifact chunked `key_quote` via `chunkText(text, charsPerScreen, lines)` + 2200ms rotation. TASK_018 (`SubtitlePreview.jsx:198-202`) replaced it with `cueAt(cues, currentTime).text ?? key_quote ?? hook_title` — neither consults `charsPerScreen`/`lines`; only CSS `maxWidth:'92%'` wraps. **Both panel controls are dead → SSOT violation.** (Currently cues empty per D4 → only whole-`key_quote` fallback renders as one long string.)

**Options:** (a) CSS wrap+line-clamp — trivial but **preview≠export** (ffmpeg can't replicate clamp); (b) **chunk + advance chunk index DERIVED from currentTime within the cue [start,end] window** — honors both controls, cue-timed, reuses the export's own math (preview==export); (c) truncate — drops words; (d) wrap-only — ignores `lines`.

**RECOMMENDED: (b)** as primary (+ (a) as a visual floor). Mechanism: `chunkText(cue.text, charsPerScreen, lines)`; `chunkIndex = clamp(floor((currentTime - cue.start)/(cueDuration/N)), 0, N-1)` DERIVED in render (NO new state/timer — per [[video-player-state-model]]). Edit mode pins chunk[0]. Fallback key_quote chunks too, rotating over `[startSec,endSec]` until D4 lands. Extract pure `selectVisibleChunk(text, currentTime, cueWindow, {charsPerScreen, lines})` to keep `SubtitlePreview` CC≤15.

## D5 diagnosis — REAL bug (verified), not only perception
Font flow is correct: `subtitleConfig.font/size/...` → `buildTextStyle` → `<span>`. Overlay is z-10, subtitle z-20 (overlay does NOT cover text). BUT: `globals.css` puts `@import url(...googleapis...)` (line 12) AFTER the `@tailwind` directives → violates CSS spec → **the production `pnpm build` STRIPS it** (verified: `dist/assets/index-*.css` has ZERO `googleapis`). ⇒ in any prod build NO custom display fonts load → all fall back to system `sans-serif` → panel font change has NO visible effect = "fonte não funciona". Dev masked it.
**Fix:** move font loading to `<link rel="stylesheet">` in `index.html` (preconnect already present; build-pipeline-independent). Acceptable alt: move `@import` above `@tailwind`. Perception (opaque overlay + tiny 14px line) is a secondary UX factor, not the root.

## Affected black-boxes / interface
- `SubtitlePreview` contract SURVIVES — additive/internal only (chunk-selection step before `highlightText`; `charsPerScreen`/`lines` already arrive in `subtitleConfig`).
- `chunkText` (`apps/web/src/lib/helpers.js`): frozen, reused. If Phase 6 export needs it server-side → MOVE canonical to `@gospelviral/shared` + re-export (per [[shared-no-import-from-web]]) so preview/export chunk identically.
- NEW pure helper `selectVisibleChunk`. No change to cueAt/buildSubtitleCues/useVideoPlayback/highlightText/SubtitleControls.

## Invariants
- **preview==export** ("o que se vê é o que se queima") — decisive for (b) over CSS-clamp. Add a test asserting the export reads the same chunkText output.
- CC≤15 (extract helper). Zero regressions; update the `SubtitlePreview` "falls back to key_quote" test to assert the CHUNKED fallback.

## Risks / edge cases
- D3 invisible until D4 makes cues non-empty (sequence/co-land).
- Single-chunk cue → static (guard ÷N). Long cue/short window → fast flicker (consider min-dwell).
- `lines` packs `chars*lines` chars but inserts no breaks; CSS decides actual lines → pair with `max-width≈chars ch` to guarantee visual line count (else `lines` is a capacity hint).
- Highlight must run on the VISIBLE chunk, not the whole cue.
- `@import`→`<link>`: verify FOUT acceptable (`display=swap`).
- Pre-existing schema mismatch (flag, out of scope): `types.js` types `size` as `number` but defaults/SIZE_MAP use `'S'|'M'|'L'`.

## Test matrix (AAA) — highlights
Pure `selectVisibleChunk`: short→single chunk; long cue t=start→chunk[0]; t≈end→chunk[N-1] clamped; mid→correct bucket; chars 15 vs 60→different chunk[0] len; lines 1 vs 3→capacity scales.
Integration: cues present + edit + small chars → chunk[0] not whole cue; player + timeupdate → later chunk; no cues + long key_quote → fallback chunk[0]; highlight on chunk only.
D5/build: font→computed fontFamily; size='L'→21px; **build regression: `pnpm build` → assert dist CSS/index.html references Google Fonts** (the test that would have caught the dropped @import).

## Open decisions
1. **TOP** — D4 sequencing (co-land or D4-first; D3 only verifiable on real cues).
2. `lines` = hard visual cap vs capacity hint.
3. Min dwell per chunk (~2.2s feel) vs even-split.
4. D5 fix form: `<link>` (recommended) vs move @import; font-URL SSOT owner.
5. `chunkText` home: web vs move to shared now.
6. `size` typedef mismatch → schema owner.
