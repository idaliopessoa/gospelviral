# TASK_017: SubtitleCue Primitive (shared)
timestamp: 2026-05-29T00:00:00Z
version: 1.1
status: Complete (merged via PR #6 on 2026-05-29)
owner: unassigned
confidence: HIGH
phase: 5

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 5" — `SubtitleCue[]` = `{ texto, start, end }`, "granularidade segue a fonte", "fonte única de timing da legenda, compartilhada com a Fase 6"
  - `apps/web/src/lib/transcript-extract.js` — already has `parseTranscriptLines` (internal: `{ tsSec, text }`) + `extractSegmentLines` / `extractSegmentText`; this is the parsing logic to consolidate
  - `packages/shared/src/types.js` — primitive typedefs; `SubtitleCue` lands here next to `VideoSource`
  - `apps/web/src/lib/helpers.js` — `timestampToSeconds`
  - TASK_013 DEC (promotion clause): "if FASE 6 (or any second consumer) needs the same extractor, the file MIGRATES to `packages/shared` rather than being duplicated" — **FASE 5/6 is that second consumer**
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"Single Source of Truth", §"Primitive-First Design"
  - `02 - Task Creation System` — protocol
- **Prerequisites**: none hard (transcript flows already); logically pairs with TASK_018 (consumer)
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `packages/shared/src/types.js` — adds the `SubtitleCue` typedef:
    ```
    @typedef {object} SubtitleCue
    @property {string} text    normalized cue text (timecodes stripped)
    @property {number} start   seconds, absolute on the video timeline
    @property {number} end     seconds, absolute; == next cue's start, last == segment end
    ```
  - `packages/shared/src/subtitle-cues.js` — `buildSubtitleCues(transcript: string, startTs: string, endTs: string): SubtitleCue[]`. One cue per transcript line that falls within `[startSec, endSec)`; `cue.start = lineSec`; `cue.end = nextLineSec` (or `endSec` for the last cue); `cue.text` normalized. Granularity mirrors the source (phrase-level transcript → phrase cues; word-level → word cues — the function imposes nothing)
  - `packages/shared/src/subtitle-cues.test.js`
  - **Transcript-parsing consolidation (DEC D2 — see below)**: `parseTranscriptLines` (+ `parseTimestampPrefix`, `isDigits`, `normalize`) move into a shared module (`packages/shared/src/transcript-lines.js`); `subtitle-cues.js` and the web `transcript-extract.js` both import it — ONE parser, no duplication. `apps/web/src/lib/transcript-extract.js` keeps its public surface (`extractSegmentLines` / `extractSegmentText`) by delegating to the shared parser (re-export or thin wrapper), so MomentCard (TASK_013) is untouched behaviorally
  - `packages/shared/src/index.js` — re-exports `SubtitleCue` typedef refs + `buildSubtitleCues`
  - Vitest suites in `packages/shared`
- **Artifacts**:
  - SonarCloud QG = PASS; `javascript:S3776 = 0`; coverage on `subtitle-cues.js` + `transcript-lines.js` = 100% (pure)
- **Decisions Generated**:
  - **DEC: `SubtitleCue` is a bilateral primitive in `@gospelviral/shared`** — Phase 5 (player sync) and Phase 6 (burned-in export) share it as the single source of truth for subtitle timing ("o que se vê é o que se queima"). Same posture as `VideoSource`.
  - **DEC (D2): transcript line-parsing is consolidated in `@gospelviral/shared`.** Honors the TASK_013 promotion clause now that a second consumer (cues, Phase 5/6) exists. `parseTranscriptLines` moves to shared; web `transcript-extract.js` delegates rather than keeping a private copy — no parallel truth. Web's public helpers (`extractSegmentLines/extractSegmentText`) keep their signatures so TASK_013's MomentCard is behaviorally unchanged.
  - **DEC: cue timing is in seconds, ABSOLUTE on the FULL VIDEO FILE timeline** (same scale as the transcript timestamps / `<video>.currentTime`), NOT relative to the cut. "Absolute of what" = the whole uploaded file: a transcript line at 47:30 → `cue.start = 2850`. The Phase 5 player compares `video.currentTime` directly against `cue.start`/`cue.end` (no subtraction). Phase 6 export consumes the same absolute cues (offsetting only at the FFmpeg layer when it trims the cut). See the cross-task TIME REFERENCE invariant.
  - **DEC: `cue.end` derives from the next cue's start; the last cue ends at the segment `endSec`.** A transcript gives only start points per line; the end is implied by the following line. This keeps cue coverage gap-free across the segment.
  - **DEC: granularity is the transcript's, untouched.** One cue per transcript line. If the transcript is phrase-timed, cues are phrase-level; if word-timed, word-level. `buildSubtitleCues` imposes no re-chunking (this is the opposite of the old `chunkText` / 2.2s rotation, which TASK_018 removes).

### INVARIANTS
- **Must Maintain**:
  - **⏱ TIME REFERENCE (cross-task invariant — 016/017/018)**: `cue.start`/`cue.end` are seconds ABSOLUTE on the full uploaded video file's timeline — the SAME scale as the transcript timestamps and as `<video>.currentTime` (e.g. a line at 47:30 → `cue.start = 2850`), NEVER relative to the cut start. `buildSubtitleCues` reads the transcript's own absolute timestamps and does NOT subtract `startSec`. This is what lets TASK_018 compare `currentTime` against `cue.start`/`cue.end` with no offset math. If cues were relative-to-cut, the subtitle would never sync.
  - `reference/viral-cristao-artifact.jsx` frozen
  - `@gospelviral/shared` keeps its hard boundary: **zero React/DOM imports, zero `@anthropic-ai/*`** (ESLint enforced). `buildSubtitleCues` is pure
  - No duplicate transcript parser: after consolidation, `parseTranscriptLines` exists in exactly ONE place (shared); web delegates
  - `extractSegmentLines` / `extractSegmentText` keep identical behavior (TASK_013 tests must stay green unchanged)
  - `buildSubtitleCues` is pure — deterministic, no DOM, no `Date.now`, no randomness, no regex on the hot path (reuse the existing char-scan parser)
  - Cognitive Complexity ≤ 15 per function
  - Zero regressions across `pnpm test` (web + server + shared)
- **Quality Gates**:
  - `subtitle-cues.test.js`: phrase-level transcript → N cues, each `start`=line ts, `end`=next line ts; last cue `end`=segment endSec; `start===end` segment → []; reversed range → []; empty/no-timestamp transcript → []; a word-level transcript (many close timestamps) → that many cues (granularity mirrored); continuation lines merge into their anchor cue's text
  - `transcript-lines.test.js`: the moved parser keeps the exact behavior the web tests pinned (mixed MM:SS / HH:MM:SS, continuation lines, normalization)
  - The existing `apps/web/src/lib/transcript-extract.test.js` passes UNCHANGED after the delegation refactor
  - SonarCloud QG = PASS; `javascript:S3776 = 0`

## Task Definition
Promote subtitle timing to a first-class shared primitive: `SubtitleCue[]`, built by a pure `buildSubtitleCues(transcript, start, end)` that slices the transcript into one cue per source line (granularity untouched), with `end` implied by the next line. Consolidate the transcript line-parser into `@gospelviral/shared` so cues (Phase 5/6) and the existing extract helpers (Phase 3) share one parser — no duplication. This is the single source of truth for subtitle timing across the live preview and the future burned-in export.

## Success Criteria
1. `buildSubtitleCues(EXAMPLE_TRANSCRIPT, '01:08', '02:15')` returns cues whose `start`/`end` tile the segment gap-free, text timecode-stripped
2. Granularity test: a word-timed fixture yields one cue per word; a phrase-timed fixture yields one cue per phrase — the function adds no chunking
3. `apps/web/src/lib/transcript-extract.test.js` passes unchanged (delegation preserved behavior)
4. `@gospelviral/shared` ESLint boundary still clean (no React/DOM)
5. SonarCloud QG = PASS; `javascript:S3776 = 0`; auditor AUDITORIA LIMPA

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Consolidation breaks TASK_013 MomentCard behavior | MEDIUM | Web helpers keep identical signatures + the TASK_013 test suite runs unchanged as the regression pin | `transcript-extract.test.js` |
| Cross-package import wiring (web → shared) trips ESLint flat rules | LOW | shared is already a web dependency (`@gospelviral/shared`); add to barrel | `pnpm lint` |
| Cue `end` for the last cue wrong (uses next-nonexistent vs segment end) | MEDIUM | Explicit test: last cue `end === endSec` | Unit test |
| Absolute-vs-relative timing confusion downstream | LOW | DEC fixes ABSOLUTE seconds; TASK_018 consumes accordingly; documented in the typedef | Code review |

## Implementation Strategy
1. **Tests first** — `transcript-lines.test.js` (moved parser), `subtitle-cues.test.js` (cues + granularity), confirm `transcript-extract.test.js` still targets the web surface
2. Move `parseTranscriptLines` + helpers into `packages/shared/src/transcript-lines.js`
3. Implement `subtitle-cues.js` (`buildSubtitleCues`) on top of it
4. Refactor web `transcript-extract.js` to delegate to the shared parser; keep public exports
5. Add `SubtitleCue` typedef + barrel exports in shared
6. Gates: lint, per-workspace coverage ([[pnpm_workspace_test_coverage_flake]]), `pnpm sonar` ([[sonar_env_sourcing]]) — **smoke:heap NOT triggered** (no hot-path file touched, [[smoke_heap_invariant_trigger_files]])
7. Auditor; PR

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_017.P1: GitFlow
**Status**: ✅ Complete — branch `feature/task-017-subtitle-cues` from `develop`; commit `2ab7177` scope `(shared)`; Co-Authored-By trailer; PR → develop (open, awaiting human gate)
### SUBTASK_017.P2: Tests
**Status**: ✅ Complete — TDD/AAA; 100% stmts/branch/funcs/lines on `time.js` + `transcript-lines.js` + `subtitle-cues.js`; TASK_013 suite (`transcript-extract.test.js`) green UNCHANGED; CC ≤ 15 (max ~9 in `parseTimestampPrefix`). Shared 51 / web 155 / server 157 all green
### SUBTASK_017.P3: Finalization
**Status**: ✅ Complete — `pnpm lint` 0; per-workspace coverage regenerated; `pnpm sonar` QG **PASS**, `javascript:S3776` new-code = **0**, total new-code issues = **0**, new coverage 95.6%; black-box-auditor → clean on all substantive invariants; PR carries the SonarCloud block. **smoke:heap = NOT triggered** (no hot-path file: no upload route / video-storage / multipart-parser touched, per [[smoke_heap_invariant_trigger_files]])

## Subtasks (Pass 2 — executed)
- SUBTASK_017.1 — ✅ moved parser → `transcript-lines.js` (`parseTranscriptLines` + `normalizeCueText`) + clock parser → `time.js` (`timestampToSeconds`); web `helpers.js` re-exports, `transcript-extract.js` delegates; tests added. (Scope addition vs DEC D2: `timestampToSeconds` also moved to shared because shared cannot import from `apps/web` and `buildSubtitleCues` needs it — canonical moved + re-exported, NOT duplicated.)
- SUBTASK_017.2 — ✅ `buildSubtitleCues` + `SubtitleCue` typedef + barrel exports + tests (incl. absolute-time pin 47:30→2850 and empty-cue tiling-gap pin)
- SUBTASK_017.3 — ✅ sonar (PASS, S3776=0) + auditor (clean) + PR

## SonarCloud (local `@sonar/scan` — repo has zero CI)
- Scan run: 2026-05-29 (analysisId `c6d88d59-84b7-4c48-aec4-2f1d6eaff698`)
- Commit scanned: `2ab7177`
- Branch: `feature/task-017-subtitle-cues`
- Quality Gate: **PASS**
- New-code coverage: 95.6%
- New-code issues: 0 (Blocker: 0, Critical: 0, Major: 0)
- `javascript:S3776` (Cognitive Complexity) on new code: **0**
- new_security_hotspots_reviewed: 100% · new_duplicated_lines_density: 0.0%
