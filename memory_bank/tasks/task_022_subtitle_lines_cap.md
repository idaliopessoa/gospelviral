# TASK_022: Subtitle size model — make `lines` a true visual cap (chars-driven font)
timestamp: 2026-05-30T00:00:00Z
version: 1.0
status: Planning
owner: unassigned
confidence: HIGH (root cause reproduced in-browser; fix is a derived font-size)

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

### OUTPUT
- **Deliverables**:
  - NEW pure helper `deriveSubtitleFontPx(canvasWidthPx, charsPerScreen, size)` in `apps/web/src/lib/helpers.js` — SSOT for subtitle font size: `(canvasWidthPx / charsPerScreen) × SIZE_FONT_SCALE[size]`. More chars → smaller font; scales with canvas width (→ preview==export proportional); `size` is a scale nudge.
  - `SubtitlePreview.buildTextStyle(config, canvasWidthPx)` — `fontSize` from the helper; `maxWidth: ${charsPerScreen}ch` (font-exact wrap, no `min(92%)` override). `SIZE_MAP` px → `SIZE_FONT_SCALE` (em-per-char-slot, conservative so charsPerScreen chars never overflow the canvas across all fonts).
- **Artifacts**: Vitest — `deriveSubtitleFontPx` (more chars → smaller; bigger size → bigger; scales with canvas; guards charsPerScreen=0). SubtitlePreview style assertions (maxWidth = `${chars}ch`, fontSize derived). Existing chunk-text tests stay green. DEC (subtitle sizing model + the `lines`-as-true-cap semantics, superseding TASK_019 D3 decision #7).

### INVARIANTS
- **Must Maintain**:
  - `lines` = N → at most N visual lines (chars/tela chars per line). `charsPerScreen` = chars per line.
  - preview == export: font-size derived from canvas width → same proportion at 280-px preview and 1080-px export. Chunk math (`chars×lines`) unchanged → highlight + cue-timing untouched.
  - `SubtitleConfig` shape unchanged ({charsPerScreen, lines, size, …}); panel controls unchanged (S/M/L still set `size`). CC ≤ 15.
- **Quality Gates**: `pnpm lint` 0; Vitest green + ≥80% on the helper; `pnpm sonar` PASS + S3776=0; Chrome DevTools MCP smoke (LINHAS=1 → exactly 1 line; raise chars → font shrinks, still fits; lines=2 → 2 lines); auditor AUDITORIA LIMPA. smoke:heap N/A (web-only).

## Task Definition
Reconcile the over-specified `{charsPerScreen, lines, size}` subtitle knobs into a coherent model: derive the font-size from `charsPerScreen` and the measured canvas width so exactly `charsPerScreen` characters fill one line, making `lines` a true visual cap (the chunk of `charsPerScreen×lines` chars wraps to at most `lines` rows), with `size` as a scale nudge — fixing the bug where `LINHAS=1` rendered 2 lines.

## Success Criteria
1. `LINHAS=1` → subtitle renders on exactly 1 visual line for a chunk of ≤ charsPerScreen chars.
2. Raising `chars/tela` shrinks the font (more chars per line) and never overflows the canvas; lowering it enlarges the font.
3. `LINHAS=2` → up to 2 lines; chunk text unchanged (`chars×lines`).
4. preview proportion == export (1080) proportion.
5. Sonar QG PASS, S3776=0, auditor AUDITORIA LIMPA, MCP smoke confirms.

## TASK_COMPLEXITY_ASSESSMENT
COMPONENTS: LOW–MEDIUM (1 helper + SubtitlePreview). INTERFACES: LOW (helper sig + buildTextStyle gains canvasWidth; component props unchanged). DOMAINS: LOW (web UI). COGNITIVE_LOAD: LOW. → **decomposition NOT required**; single task + P1/P2/P3.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_022.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-022-subtitle-lines-cap` from `develop`; conventional `(web)`; PR → develop; Co-Authored-By.
### SUBTASK_022.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; ≥80% on `deriveSubtitleFontPx`; existing suites green; CC ≤ 15.
### SUBTASK_022.P3: Finalization
**Status**: ⏱️ Not Started — lint 0; coverage; `pnpm sonar` PASS + S3776=0; smoke:heap N/A; Chrome DevTools MCP smoke (1 line at LINHAS=1) + screenshot; black-box-auditor → AUDITORIA LIMPA; PR with SonarCloud block. Human gate at PR.
