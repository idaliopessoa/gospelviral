# TASK_019: Player + Subtitle real-use fixes + streaming/schema hardening
timestamp: 2026-05-29T00:00:00Z
version: 1.0
status: Planning
owner: unassigned
confidence: MEDIUM
phase: 5 (follow-up to TASK_018)

> Pass 1 (this file) = task creation + interface + complexity assessment + P1/P2/P3 + registry. Domain subtask decomposition is the NEXT pass (Pass 2). Source insumos: `memory_bank/tasks/evidence/local-smoke/task_018_followup_INSUMOS.md` + `findings-{A,B,C,D}-*.md` + real `analyze-60-request/response`.

## Black Box Interface

### INPUT
- **Required Context**:
  - `memory_bank/tasks/evidence/local-smoke/task_018_followup_INSUMOS.md` — consolidated roots/fixes/decisions/dependency-graph (the spec for this task)
  - `findings-A-transcript-parser.md` (D4), `findings-B-subtitle-render.md` (D3/D5), `findings-C-video-layer.md` (D1/D2), `findings-D-cold-open.md` (D6)
  - `analyze-60-request.network-request` (real editor-timecode transcript) + `analyze-60-response.network-response` (real moments w/ cold-open peaks) — fixtures for D4/D6 tests
  - `01-Systems-Architecture-Expert-viral-cristao.md` (lens) + `02 - Task Creation System` (protocol)
  - Affected files: `apps/web/src/components/SubtitlePreview.jsx`, `SubtitleControls.jsx`, `apps/web/src/hooks/useVideoPlayback.js`, `apps/web/src/lib/{cueAt,helpers,text-highlight}.js`, `apps/web/src/styles/globals.css`, `apps/web/index.html`, `packages/shared/src/{transcript-lines,subtitle-cues,types,time}.js`, `apps/server/src/routes/{analyze,upload}.js`, `apps/server/src/lib/range.js`, `apps/web/src/App.jsx`, `ResultsView.jsx`, `MomentCard.jsx`
- **Prerequisites** (resolved with human):
  - TASK_018 — **merged via PR #7**; TASK_019 branches from `develop` (decision #1). The temporary `[stream-debug]` was reverted at TASK_019 creation (was uncommitted; never in #7).
  - TASK_016 (stream route), TASK_017 (cues) — Complete.
  - **O1 (analyze-504) spun out → TASK_020** (decision #2); NOT in this task's scope.
- **Parameters**: none.

### OUTPUT
- **Deliverables** (per the consolidated insumos):
  - **D4** — `packages/shared/src/transcript-lines.js`: extend `parseTranscriptLines` with line-level format auto-detection to accept the real editor-timecode export (`HH:MM:SS:FF - HH:MM:SS:FF` + `Unknown` speaker line + text on following lines); drop frames, anchor on range START, skip speaker line. SSOT — fixes both `buildSubtitleCues` and `extractSegmentLines`. Frozen `MM:SS` tests stay green.
  - **D3** — `SubtitlePreview` re-applies `charsPerScreen`/`lines`: new pure `selectVisibleChunk(text, currentTime, cueWindow, {charsPerScreen, lines})` using `chunkText`, chunk index DERIVED from `currentTime` (no timer). Edit pins chunk[0]; fallback chunks too.
  - **D5** — move Google Fonts load from `globals.css` `@import` (stripped by prod build) to `<link>` in `apps/web/index.html`. Custom fonts load in prod.
  - **D1** — `VideoLayer`: `hasVideo = Boolean(videoSource)` (drop `mode==='player'`) → uploaded `<video>` poster (seek startSec) in BOTH modes; YouTube thumbnail = no-videoSource fallback only.
  - **D2 + D6 (coordinated single hook refactor)** — `useVideoPlayback`:
    - D2: add `pause()`/`toggle()`/`isPlaying` (additive return); paused-but-active (`playingIndex` SSOT unchanged); `isPlaying` event-driven off the `<video>`. Play/toggle gated to player mode.
    - D6: input `startSec/endSec` → `segments: Array<{start,end}>`; internal `segmentIndex`; `timeupdate` advances to next segment instead of pausing; only the LAST segment fires `onReachEnd`. New pure helpers (shared): `parseColdOpenRange(peakString) → {start,end}|null`, `buildPlaybackSegments(moment, coldOpenRange) → segments[]`, `advanceSegment(t, segments, idx)`. Cold-open `apply_cold_open` → `[peak, fullCut]`; else `[fullCut]`.
  - **O2 (stream-to-EOF)** — `apps/server/src/routes/upload.js` + `lib/range.js`: cap the open-ended `bytes=START-` response to a bounded chunk instead of streaming to EOF (browser re-requests as it plays). Reduces deep-seek flooding on large files.
  - **O3 (size typedef)** — `packages/shared/src/types.js`: fix `SubtitleConfig.size` typedef (`number` → `'S'|'M'|'L'`).
  - **O4 (cleanup)** — remove the temporary `[stream-debug]` `console.log` from `apps/server/src/routes/upload.js`.
- **Artifacts**:
  - Tests: Vitest unit (new pure helpers: parser format-detect, selectVisibleChunk, parseColdOpenRange, buildPlaybackSegments, advanceSegment), component (`SubtitlePreview` D1/D3, drag-gating), hook (`useVideoPlayback` segments + pause/toggle, single-segment back-compat), integration (`App.playback` cold-open sequence + pause), server (range chunk cap, analyze keep-alive). Real-format fixtures from `analyze-60-*`.
  - Docs: DEC entries (see below); task status + registry.
- **Decisions Generated** (adopted recommendations — confirm at Pass 2):
  1. D4 normalization lives in the **shared parser** (SSOT), not a web-boundary normalizer.
  2. D5 fix via **`<link>` in index.html** (build-safe).
  3. D2 = **paused-but-active** (`playingIndex` intact).
  4. D6 hook migration = **replace `startSec/endSec` with `segments[]`** (single caller).
  5. D6 schema = tighten `peak_moment.timestamp` typedef to a range now; parse **client-side** (`parseColdOpenRange`); defer server normalization.
  6. `chunkText` stays in `apps/web/lib` for now (move to shared only when Phase 6 burn needs it).
  7. `lines` = **hard visual cap** (chunk + `max-width` in ch).
  - Likely new DEC: cold-open playback model (segment sequence); O1 streaming approach (possible DEC_021 reversal).

### INVARIANTS
- **Must Maintain**:
  - **⏱ TIME REFERENCE (016/017/018/019)** — all time absolute file-timeline seconds; segments/cues/`currentTime` compared with NO offset math.
  - **`SubtitlePreview` + `useVideoPlayback` public contracts survive** — all additions ADDITIVE; `useVideoPlayback` return shape stays a superset; single-segment `[{start,end}]` reproduces pre-D6 behavior exactly.
  - **Panel is SSOT for on-screen subtitle** — `subtitleConfig` (font/size/chars/lines) drives what renders; **preview==export** ("o que se vê é o que se queima") → ONE chunking truth (`chunkText`), never CSS-clamp-only.
  - **Autoplay-safety** — PLAY/resume synchronous in the click gesture; PAUSE reactive. **One-plays-at-a-time** preserved.
  - `App.jsx` single owner of `playingIndex`; `mode` derived from `isConfigCollapsed`.
  - Frozen `MM:SS` transcript tests + `reference/viral-cristao-artifact.jsx` untouched.
  - `@gospelviral/shared` hard boundary (no React/DOM/@anthropic); `apps/server` never imports web.
  - Cognitive Complexity ≤ 15 per function/component (decompose: parser, segment logic, chunk selection).
- **Quality Gates**:
  - `pnpm lint` 0; Vitest all green, zero regressions; coverage ≥ 80% on new code + non-decreasing baseline.
  - Local `pnpm sonar` Quality Gate = PASS; `javascript:S3776` on new code = 0.
  - **`pnpm smoke:heap` REQUIRED** — O2 + O4 touch `apps/server/src/routes/upload.js` (a streaming-RAM hot-path trigger file). Run in P3.
  - Chrome DevTools MCP smoke with a REAL large video: D1 (video both modes), D2 (pause), D3 (chars/lines respected), D4 (cues populate, no "indisponível"), D5 (font changes visibly — prod build check), D6 (cold-open plays peak then full cut). Screenshots + network counts.
  - black-box-auditor → "AUDITORIA LIMPA".

## Task Definition
Fix the ten real-use defects found while testing the TASK_018 player against a real sermon + a real video upload: make the uploaded video the canvas source in both modes (D1) with play/pause (D2); restore the panel as the SSOT for on-screen subtitle shape (D3) including the font that silently never loaded in production (D5); teach the transcript parser the real video-editor timecode format so cues populate instead of "Transcript indisponível" (D4); play the cold-open peak before the full cut as a segment sequence (D6); and harden the surrounding seams — the stream-to-EOF range inefficiency (O2), a `size` typedef mismatch (O3), and removal of temporary debug instrumentation (O4). (The analyze-504 long-run defect was spun out to TASK_020.)

## Success Criteria
1. **D1** — with a `videoSource`, the preview renders the uploaded `<video>` (poster at startSec) in BOTH player and edit modes; the YouTube thumbnail only appears when there is no `videoSource`.
2. **D2** — clicking the playing card pauses it; clicking again resumes (synchronous in the gesture); one-plays-at-a-time still holds.
3. **D3** — the subtitle respects `charsPerScreen` and `lines` from the panel; changing them changes what renders (preview matches the future burned export's chunking).
4. **D4** — a real editor-timecode transcript (`HH:MM:SS:FF - … / Unknown / text`) yields cues for the moment ranges; no "Transcript indisponível" for covered ranges; frozen `MM:SS` tests still pass.
5. **D5** — changing the subtitle font visibly changes the rendered subtitle, including in a production `pnpm build` (the Google Fonts bundle is no longer stripped).
6. **D6** — for `apply_cold_open` moments, playback plays the peak window first, then the full cut in sequence (peak replays in context); `keep_linear` plays the single cut; cues stay aligned across both passes.
7. **O2** — a deep seek no longer streams hundreds of MB to EOF; the range response is bounded.
8. **O3** — `SubtitleConfig.size` typedef matches its `'S'|'M'|'L'` usage.
9. **O4** — no `[stream-debug]` (or other temporary instrumentation) remains.
10. Sonar QG PASS, S3776=0, smoke:heap pass, MCP smoke screenshots captured, auditor AUDITORIA LIMPA.
(O1 analyze-504 → TASK_020.)

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| `useVideoPlayback` touched by D2 + D6 in conflicting ways | HIGH | One coordinated hook refactor (segments[] + pause/toggle/isPlaying together); single-segment back-compat tests | Hook tests + integration |
| D4 parser change breaks frozen `MM:SS` behavior | MEDIUM | Auto-detect is additive; frozen tests are the guard; new branch unreachable by old fixtures | transcript-lines/extract tests |
| preview≠export if D3 uses CSS-clamp | MEDIUM | Chunk via `chunkText` (the export's own math); test preview==export | Component test |
| Backward seek (cut start < peak) on 1.56 GB non-faststart stalls at the cold-open→cut transition | MEDIUM | Couple with O2 (bounded range); document; MCP smoke | MCP smoke |
| `timestampToSeconds(rangeString)` silently returns 0 | MEDIUM | Single `parseColdOpenRange` entry + explicit regression test | Unit test |
| smoke:heap regression from O2 range change | MEDIUM | Run `pnpm smoke:heap` in P3 (mandatory — upload route touched) | smoke:heap |
| Scope is large (9 items, 3 domains; O1 spun out) | HIGH | MANDATORY decomposition (6 subtasks below); sequence by the dependency graph | Pass 2 |

## Implementation Strategy
High-level, sequenced by the insumos dependency graph (detailed subtasks in Pass 2):
1. **O4 + O3 + D5** — trivial/independent quick wins (remove debug log; fix typedef; move font `<link>`). D5 needs a prod-build assertion.
2. **D4** (parser) — unblocks D3; SSOT shared parser with format auto-detection; real-format fixtures.
3. **D3** (chunk render) — after D4; `selectVisibleChunk` derived from currentTime.
4. **D1** (video poster both modes) — `SubtitlePreview` VideoLayer.
5. **D2 + D6** — ONE coordinated `useVideoPlayback` refactor (segments[] + pause/toggle/isPlaying) + the cold-open segment helpers; integration tests for sequence + pause.
6. **O2** (range cap) — bounded `bytes=START-`; smoke:heap.
7. Gates: lint, per-workspace coverage, `pnpm sonar`, `pnpm smoke:heap`, MCP smoke (real video), auditor, PR. (O1/504 → TASK_020.)

## TASK_COMPLEXITY_ASSESSMENT
- COMPONENTS: **HIGH** (SubtitlePreview, useVideoPlayback, shared parser/cues, globals.css/index.html, analyze route, upload/range route, types.js, App/ResultsView/MomentCard).
- INTERFACES: **HIGH** (useVideoPlayback signature `segments[]`+pause, transcript parser, SubtitleConfig usage, cold-open helpers, range chunk cap).
- DOMAINS: **HIGH** (frontend player/UI + shared parsing + backend streaming).
- COGNITIVE_LOAD: **HIGH** (cross-domain, multi-session).
→ **DECOMPOSITION TRIGGERED** (4 HIGH). Decomposed below (Pass 2) into 6 black-box subtasks. O1 spun out → TASK_020.

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_019.P1: GitFlow
**Status**: ⏱️ Not Started — branch `feature/task-019-player-subtitle-fixes` from `develop` (after PR #7 merges, or stacked — see Prerequisites); conventional commits scoped per cluster `(player)`/`(shared)`/`(server)`/`(web)`; PR → develop; Co-Authored-By trailer.
### SUBTASK_019.P2: Tests
**Status**: ⏱️ Not Started — TDD/AAA; ≥ 80% on new pure helpers + hooks; frozen `MM:SS` + existing SubtitlePreview/useVideoPlayback/App.playback suites stay green (additive); CC ≤ 15.
### SUBTASK_019.P3: Finalization
**Status**: ⏱️ Not Started — `pnpm lint` 0; per-workspace coverage ([[pnpm_workspace_test_coverage_flake]]); `pnpm sonar` PASS + S3776=0 ([[sonar_env_sourcing]], [[sonar_quality_gate_gotchas]]); **`pnpm smoke:heap` (upload route touched — [[smoke_heap_invariant_trigger_files]])**; Chrome DevTools MCP smoke with a REAL large video (D1–D6) + screenshots + network counts; black-box-auditor → AUDITORIA LIMPA; PR with SonarCloud block.

## Subtasks (Pass 2 — decomposed)

> Dependency graph: **019.1** (quick wins) ‖ **019.2 → 019.3** ‖ **019.4** ‖ **019.5** ‖ **019.6**. Only hard edge: 019.2 blocks 019.3. 019.3/019.4/019.5 all touch `SubtitlePreview` → land in that order (or careful sequential merge) to avoid churn. 019.5 is the heaviest. Each subtask is its own branch-able TDD black box; all run under the single TASK_019 GitFlow branch.

### SUBTASK_019.1: Quick wins — debug cleanup + size typedef + font load (O4, O3, D5)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: `apps/server/src/routes/upload.js` (verify no temp instrumentation), `packages/shared/src/types.js` (`SubtitleConfig.size`), `apps/web/src/styles/globals.css` (`@import`) + `apps/web/index.html`.
**OUTPUT**: O4 — confirm/ensure no `[stream-debug]` or temp logs remain. O3 — `SubtitleConfig.size` typedef `number` → `'S'|'M'|'L'`. D5 — move Google Fonts load from the stripped `@import` to a `<link rel="stylesheet">` in `index.html`; remove the `@import` from `globals.css`.
**INVARIANTS**: custom fonts load in a production `pnpm build` (dist CSS/HTML references the font URL); typedef matches runtime usage; no visual change beyond font availability; lint/sonar clean.
#### Acceptance
- [ ] Build-regression test: after `pnpm build`, the bundle/`index.html` references Google Fonts (would have caught the dropped `@import`).
- [ ] `SubtitleConfig.size` typedef = `'S'|'M'|'L'`; no consumers broken.
- [ ] grep: zero `stream-debug`/temp instrumentation in server.
#### Dependencies — Depends on: none · Blocks: none. Effort: Low.

### SUBTASK_019.2: Transcript parser — real editor-timecode format (D4)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: `packages/shared/src/transcript-lines.js` (`parseTranscriptLines`); real fixture `evidence/local-smoke/analyze-60-request.network-request`; frozen `MM:SS` tests (`transcript-lines.test.js`, `subtitle-cues.test.js`, web `transcript-extract.test.js`).
**OUTPUT**: `parseTranscriptLines` auto-detects format per line and ALSO parses the editor export (`HH:MM:SS:FF - HH:MM:SS:FF` range + `Unknown` speaker line + spoken text on following line(s)): drop frames, anchor on the range START (absolute seconds), skip the speaker line, attach following text. Fixes BOTH `buildSubtitleCues` and `extractSegmentLines` via the one SSOT parser. Public signature unchanged.
**INVARIANTS**: frozen `MM:SS` behavior byte-identical (additive branch); TIME REFERENCE absolute seconds (frames discarded/rounded consistently); `@gospelviral/shared` boundary; CC ≤ 15 (decompose the parser).
#### Acceptance
- [ ] Real-format fixture → non-empty cues for the 5 moment ranges; no "Transcript indisponível" for covered ranges.
- [ ] All frozen `MM:SS` tests still pass (zero regression).
- [ ] Unit tests: both formats + edge cases (frames, blank lines, trailing `Clique aqui`, missing text, mixed).
#### Dependencies — Depends on: none · Blocks: 019.3. Effort: Medium-High.

### SUBTASK_019.3: Subtitle chunk render — panel as SSOT (D3)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: 019.2 output (cues populate); `apps/web/src/components/SubtitlePreview.jsx`, `apps/web/src/lib/helpers.js` (`chunkText`), `subtitleConfig` (`charsPerScreen`, `lines`), `cueAt`.
**OUTPUT**: pure `selectVisibleChunk(text, currentTime, cueWindow, {charsPerScreen, lines})`; `SubtitlePreview` renders the chunk (index DERIVED from `currentTime` within the cue `[start,end]`, no timer); edit pins chunk[0]; `key_quote` fallback chunks too; pair with `max-width ≈ chars ch` for a hard visual line cap (decision #7).
**INVARIANTS**: panel = SSOT for on-screen text shape; **preview == export** (single `chunkText` truth, never CSS-clamp-only); `currentTime` is the only clock (no new state/timer); `SubtitlePreview` contract additive; CC ≤ 15.
#### Acceptance
- [ ] Changing `charsPerScreen`/`lines` changes what renders.
- [ ] Edit mode shows chunk[0]; player advances chunks with `currentTime`.
- [ ] Highlight runs on the visible chunk; existing `SubtitlePreview` "fallback" test updated to assert chunked fallback.
#### Dependencies — Depends on: 019.2 · Blocks: none (coordinate SubtitlePreview with 019.4/019.5). Effort: Medium.

### SUBTASK_019.4: Video as canvas source in both modes (D1)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: `SubtitlePreview.jsx` (`VideoLayer`, `hasVideo`/`editable`), `useVideoPlayback` (poster seek), `videoSource`.
**OUTPUT**: `hasVideo = Boolean(videoSource)` (drop `mode==='player'`) → uploaded `<video>` poster (seek `startSec` via `loadedmetadata`) in BOTH modes; YouTube thumbnail only when no `videoSource`. Drag stays gated to edit (on the wrapper; `<video>` is `pointer-events-none`).
**INVARIANTS**: no autoplay in edit (reactive pause holds it); drag works in edit; `SubtitlePreview` contract; existing "static thumbnail in edit with videoSource" test rewritten (it encoded the bug).
#### Acceptance
- [ ] `videoSource` + edit → `<video>` rendered (not YouTube `<img>`); no `videoSource` → thumbnail.
- [ ] Drag in edit still produces config deltas.
#### Dependencies — Depends on: none · Blocks: none (coordinate SubtitlePreview). Effort: Low-Medium.

### SUBTASK_019.5: Playback hook — pause/toggle + cold-open segment sequence (D2 + D6)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: `apps/web/src/hooks/useVideoPlayback.js`; `packages/shared/src/{types,time}.js` (`cold_open_analysis.peak_moment`); `App.jsx`/`ResultsView.jsx` (`playingIndex`); real moments fixture (`analyze-60-response`).
**OUTPUT**:
- New shared pure helpers: `parseColdOpenRange(peakString) → {start,end}|null` (splits `"A-B"` FIRST — avoids the `timestampToSeconds(range)===0` trap), `buildPlaybackSegments(moment, coldOpenRange) → Array<{start,end}>` (apply_cold_open → `[peak, fullCut]`; else `[fullCut]`), `advanceSegment(t, segments, idx) → {nextIndex, seekTo|null, reachedEnd}`.
- `useVideoPlayback({segments, isActivePlayer, onReachEnd}) → {videoRef, currentTime, play, pause, toggle, isPlaying}` — replaces `startSec/endSec` with `segments[]`; internal `segmentIndex`; `timeupdate` advances to next segment (seek) instead of pausing; `onReachEnd` only at the LAST segment. D2: `pause()`/`toggle()`/`isPlaying` additive, paused-but-active (`playingIndex` SSOT unchanged), `isPlaying` event-driven off the element.
- `SubtitlePreview` computes `segments` + shows pause affordance (`!isPlaying`, gated to player mode); tighten `peak_moment.timestamp` typedef to a range.
**INVARIANTS**: autoplay-safety (play/resume synchronous in gesture; pause reactive); single-segment `[{start,end}]` reproduces pre-D6 behavior exactly; absolute TIME REFERENCE (no offset math); cue alignment across both passes (cues unchanged — peak ⊆ cut); one-plays-at-a-time; CC ≤ 15 (helpers extracted).
#### Acceptance
- [ ] `apply_cold_open` → plays peak then full cut (peak replays in context); `keep_linear` → single cut.
- [ ] Clicking the playing card pauses; clicking again resumes; one-at-a-time holds.
- [ ] Regression test `timestampToSeconds("01:28:43-01:29:00") === 0` (documents why split-first is needed).
- [ ] Existing `useVideoPlayback`/`App.playback` suites pass after harness update to `segments`.
#### Dependencies — Depends on: none · Blocks: none (converges on SubtitlePreview with 019.3/019.4). Effort: High.

### SUBTASK_019.6: Range chunk cap (O2)
**Status**: ⏱️ Not Started
#### Black Box Interface
**INPUT**: `apps/server/src/routes/upload.js` (GET `/:id/stream`), `apps/server/src/lib/range.js`.
**OUTPUT**: cap an open-ended `bytes=START-` request to a bounded chunk (configurable N MB) instead of streaming to EOF; the browser re-requests as it plays. `Content-Range`/`Content-Length` reflect the capped chunk; status stays 206.
**INVARIANTS**: streaming-RAM invariant (always `createReadStream`, never buffer) — **`pnpm smoke:heap` MUST pass**; range correctness; existing `range.js`/stream tests green.
#### Acceptance
- [ ] A deep `bytes=START-` seek returns a bounded body (not to EOF); subsequent re-requests serve the next chunk.
- [ ] `pnpm smoke:heap` passes.
- [ ] `range.js` unit tests cover the capped open-ended case.
#### Dependencies — Depends on: none · Blocks: none. Effort: Medium.
