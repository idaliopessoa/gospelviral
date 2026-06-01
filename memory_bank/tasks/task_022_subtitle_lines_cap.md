# TASK_022: Subtitle size model — `lines` a true visual cap (orthogonal knobs: size→font, chars/tela→width, lines→cap)
timestamp: 2026-05-30T00:00:00Z
version: 1.1
status: Active — implemented + MCP-verified; PR #11 open (awaiting merge)
owner: unassigned
confidence: HIGH (root cause reproduced in-browser; orthogonal-knobs fix verified)

> Trigger: panel `LINHAS = 1` but the subtitle renders on 2 lines. Reproduced in Chrome DevTools MCP: chunk = 36 chars (correct), but `max-width: min(92%, 36ch)` collapses to `92%` (~149px) on the narrow canvas and the font-size is never scaled, so 36 chars wrap to 2 lines.

## Black Box Interface

### INPUT
- **Required Context**:
  - `apps/web/src/components/SubtitlePreview.jsx` `buildTextStyle` — `fontSize: SIZE_MAP[size]` is FIXED px (14/17/21), never scaled by `scaleFactor`; `maxWidth: min(92%, charsPerScreen ch)`.
  - `apps/web/src/hooks/useCanvasMeasurement.js` — exposes `canvasSize.width` (DOM px) + `scaleFactor`.
  - `apps/web/src/lib/helpers.js` `selectVisibleChunk`/`chunkText` — chunk = charsPerScreen×lines (unchanged).
  - `reference/viral-cristao-artifact.jsx` — the frozen artifact used `maxWidth: '92%'` + chunk-rotation; `lines` was only a chunk-capacity multiplier, NEVER a visual-line cap. (TASK_018/019 already replaced rotation with cue-timed chunks, so the subtitle render already diverges from the artifact by design.)
  - Lens: `01-Systems-Architecture-Expert-viral-cristao.md` — coordinate system is the 1080 reference scaled by `scaleFactor`; SSOT; primitive-first; one-good-way.
- **Prerequisites**: TASK_019 (D3 chunking) — Complete.

### OUTPUT (final — orthogonal-knobs model, post-review)
> Model decision (supersedes TASK_019 D3 decision #7 and this task's own first pass): the three subtitle knobs are ORTHOGONAL — `size` → font, `chars/tela` → line width, `lines` → line count. The first pass derived the font from `charsPerScreen` (font shrank as chars/tela grew); review rejected that ("chars/tela must not change the font"), so the font now depends ONLY on `size`.
- **Deliverables**:
  - NEW pure helper `deriveSubtitleFontPx(canvasWidthPx, size)` in `apps/web/src/lib/helpers.js` — SSOT for subtitle font size = `canvasWidthPx × SUBTITLE_SIZE_FRACTION[size]`. Depends ONLY on `size` + canvas width (NOT charsPerScreen); scales with the canvas → preview == 1080 export.
  - NEW pure helper `subtitleCharsPerLine(charsPerScreen, canvasWidthPx, fontPx, advanceEm)` — `chars/tela` = effective chars-per-line (line WIDTH) = `min(charsPerScreen, floor(wrap/(advance×fontPx)))`, capped to what fits the size-driven font. Keeps `lines` a true cap; never raises the font.
  - `measureCharAdvanceEm(font)` — Canvas-2D average glyph advance (memoized; jsdom-safe fallback) feeding the cap above.
  - `SubtitlePreview` — `fontPx = deriveSubtitleFontPx(canvas, size)`; `perLine = subtitleCharsPerLine(...)`; chunk via `selectVisibleChunk(…, {charsPerScreen: perLine, lines})`; `SubtitleLayer` gets an explicit wrap `width` (= the perLine line width, ≤ `canvas × SUBTITLE_LINE_MAX_FRACTION`) — fixes the `left:50%` shrink-to-fit-to-half-canvas layout bug. `buildTextStyle(config, fontPx)`; `SIZE_MAP` removed.
- **Artifacts**: Vitest — `deriveSubtitleFontPx` (font INDEPENDENT of chars; S<M<L; canvas-proportional), `subtitleCharsPerLine` (fits→desired; caps when too many; perLine line ≤ wrap; guards), `measureCharAdvanceEm` (measured vs fallback). Existing chunk-text + SubtitlePreview tests stay green. Chrome DevTools MCP smoke confirms: LINHAS 1/2/3 → 1/2/3 lines AND chars/tela does not change the font.

### INVARIANTS
- **Must Maintain**:
  - `lines` = N → at most N visual lines (chars/tela chars per line). `charsPerScreen` = chars per line.
  - Font size is a pure function of (`size`, canvas width) — NOT of `charsPerScreen`; the chars/tela slider never changes the font.
  - preview == export: font scales with canvas width → same proportion at 280-px preview and 1080-px export. Chunk math (`perLine×lines`) unchanged → highlight + cue-timing untouched.
  - `SubtitleConfig` shape unchanged ({charsPerScreen, lines, size, …}); panel controls unchanged (S/M/L still set `size`). CC ≤ 15.
- **Quality Gates**: `pnpm lint` 0; Vitest green + ≥80% on the helper; `pnpm sonar` PASS + S3776=0; Chrome DevTools MCP smoke (LINHAS=1 → exactly 1 line; raise chars → font shrinks, still fits; lines=2 → 2 lines); auditor AUDITORIA LIMPA. smoke:heap N/A (web-only).

## Task Definition
Reconcile the over-specified `{charsPerScreen, lines, size}` subtitle knobs into ORTHOGONAL controls: `size` sets the font (scaled to the canvas, independent of charsPerScreen), `chars/tela` sets the effective chars-per-line / line WIDTH (capped to what fits the size-driven font), and `lines` is a true visual cap (a `perLine×lines` chunk wraps to at most `lines` rows) — fixing both the `LINHAS=1`-renders-2-lines bug AND the chars/tela slider wrongly changing the font size.

## Success Criteria
1. `LINHAS=1` → subtitle renders on exactly 1 visual line for a chunk of ≤ perLine chars.
2. `chars/tela` changes the line WIDTH (effective chars-per-line, capped to fit), never the font size; `size` (S/M/L) is the only font-size control.
3. `LINHAS=2` → up to 2 lines; chunk text unchanged (`perLine×lines`).
4. preview proportion == export (1080) proportion.
5. Sonar QG PASS, S3776=0, auditor AUDITORIA LIMPA, MCP smoke confirms.

## TASK_COMPLEXITY_ASSESSMENT
COMPONENTS: LOW–MEDIUM (1 helper + SubtitlePreview). INTERFACES: LOW (helper sig + buildTextStyle gains canvasWidth; component props unchanged). DOMAINS: LOW (web UI). COGNITIVE_LOAD: LOW. → **decomposition NOT required**; single task + P1/P2/P3.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_022.P1: GitFlow
**Status**: ✅ Complete — branch `feature/task-022-subtitle-lines-cap` from `develop`; conventional `(web)`; PR → develop; Co-Authored-By.
### SUBTASK_022.P2: Tests
**Status**: ✅ Complete — TDD/AAA; ≥80% on `deriveSubtitleFontPx`; existing suites green; CC ≤ 15.
### SUBTASK_022.P3: Finalization
**Status**: 🔄 In Progress (gates green; PR #11 open; human gate before merge) — lint 0; coverage; `pnpm sonar` PASS + S3776=0; smoke:heap N/A; Chrome DevTools MCP smoke (1 line at LINHAS=1) + screenshot; black-box-auditor → AUDITORIA LIMPA; PR with SonarCloud block. Human gate at PR.
