# TASK_018: Play + Subtitle Sync (frontend)
timestamp: 2026-05-29T00:00:00Z
version: 1.0
status: Ready
owner: unassigned
confidence: MEDIUM
phase: 5

## Black Box Interface

### INPUT
- **Required Context**:
  - `bootstrap-features-fases-3-6.md` §"FASE 5" — full behavior spec (player vs edição mode, one-plays-at-a-time, config-open-pauses, cue sync by transcript timecode, remove the 2.2s timer, `isConfigCollapsed` doubles as mode)
  - TASK_016 OUTPUT — `GET /api/upload/video/:id/stream` (range-enabled) for the `<video src>`
  - TASK_017 OUTPUT — `buildSubtitleCues` + `SubtitleCue` from `@gospelviral/shared`
  - TASK_015 OUTPUT — `videoSource` in `App.jsx`, threaded to `ConfigPanel`; here it also reaches `MomentCard` / `SubtitlePreview`
  - `apps/web/src/components/SubtitlePreview.jsx` — current canvas (`VideoLayer` = static YouTube thumbnail, `SubtitleLayer`, drag via `usePointerDrag`, `useChunkRotation` 2.2s timer to REMOVE)
  - `apps/web/src/hooks/useChunkRotation.js` — the 2.2s rotation to delete
  - `apps/web/src/components/MomentCard.jsx` + `views/ResultsView.jsx` + `App.jsx` — threading + global state owners
  - `apps/web/src/hooks/usePointerDrag.js`, `useCanvasMeasurement.js` — kept; drag is gated by mode
  - `01-Systems-Architecture-Expert-viral-cristao.md` §"SSOT", §"Replaceable Components" (the `SubtitlePreview` interface must survive)
  - `02 - Task Creation System` — protocol
  - Memory: [[smoke_heap_invariant_trigger_files]] — **frontend-only; does NOT touch the 3 hot-path files → smoke:heap NOT triggered**
- **Prerequisites**: TASK_015 (videoSource), TASK_016 (stream route), TASK_017 (cues) — all Complete
- **Parameters**: none

### OUTPUT
- **Deliverables**:
  - `apps/web/src/hooks/useVideoPlayback.js` — owns the per-card `<video>` element lifecycle for the active player: `play()` (if `currentTime >= endSec` or `< startSec`, seek `startSec` first — restart-on-replay per D-end), pause at `endSec`, clamp `currentTime` to `[startSec, endSec]`, expose `currentTime`. All times absolute-file-timeline (see TIME REFERENCE invariant). Pure-ish hook around a `ref`
  - `apps/web/src/hooks/useActiveCue.js` (or a pure selector `cueAt(cues, t)`) — maps `currentTime` → the active `SubtitleCue` (binary/linear scan). Pure selector preferred (testable without React)
  - `apps/web/src/components/SubtitlePreview.jsx` — refactored:
    - `VideoLayer` renders a real `<video src="/api/upload/video/<id>/stream">` when `videoSource` is present + mode is PLAYER; otherwise the current static thumbnail (fallback, no `videoSource` or EDIÇÃO)
    - central **Play button** overlay on the canvas (PLAYER mode, when a `videoSource` exists, when this card is not the active player)
    - subtitle text comes from the **active cue** (`cueAt(cues, currentTime)`) in PLAYER mode; in EDIÇÃO mode shows a static representative cue (cue[0] / first line) — NOT the 2.2s rotation
    - drag handlers active ONLY in EDIÇÃO mode (`usePointerDrag` gated)
    - the `useChunkRotation` import + the `N/M` chunk badge REMOVED (2.2s timer gone)
    - **`SubtitlePreview` props contract extended** (additive): `videoSource`, `cues`, `mode` ('player'|'edit'), `isActivePlayer`, `onRequestPlay` — existing props preserved
  - `apps/web/src/components/MomentCard.jsx` — passes `videoSource`, `cues` (built via `buildSubtitleCues(transcript, moment.timestamp_start, moment.timestamp_end)` memoized), `mode`, `isActivePlayer`, `onRequestPlay` into `SubtitlePreview`
  - `apps/web/src/views/ResultsView.jsx` — threads `videoSource`, the mode (derived from `isCollapsed`), `playingIndex` + `onRequestPlay` to each `MomentCard`
  - `apps/web/src/App.jsx` — new global state `playingIndex` (which card is playing, or `null`); `mode` derived from `isConfigCollapsed` (collapsed → 'player', open → 'edit'); opening any config tab (already toggles `isConfigCollapsed=false`) sets `playingIndex = null` (pauses everything)
  - `useChunkRotation.js` + its test — DELETED (or emptied) since the 2.2s timer is removed; confirm no other consumer
  - Vitest suites: `useVideoPlayback`/`cueAt` selector, `SubtitlePreview` (player vs edit, fallback, cue text, play button, drag-gating), `MomentCard` (cues passed), `App`/`ResultsView` integration (one-plays-at-a-time, config-open-pauses)
- **Artifacts**:
  - SonarCloud QG = PASS; `javascript:S3776 = 0`; coverage ≥ 80% on the new hooks + ≥ the existing baseline on touched components
- **Decisions Generated**:
  - **DEC: mode is derived, not stored.** `mode = isConfigCollapsed ? 'player' : 'edit'`. The bootstrap says the collapse control "ganha função de estado de modo" — so there is NO new mode state; it is a pure derivation of the existing `isConfigCollapsed`. Global to all 5 cards (config is global → mode is global).
  - **DEC: one-plays-at-a-time via a single `playingIndex` in App.** Play on card N sets `playingIndex = N`; every other card sees `isActivePlayer === false` and pauses. `null` = nothing playing. SSOT in App, threaded down (same posture as `activeCardTab`).
  - **DEC: opening any config tab pauses playback.** The ConfigPanel tab click already forces `isConfigCollapsed = false` (TASK_013-era behavior). Entering EDIÇÃO mode sets `playingIndex = null`. So the pause is a consequence of the mode flip, wired in App.
  - **DEC: the 2.2s `useChunkRotation` timer is REMOVED.** Subtitle text is driven by `<video>.currentTime` → active cue in PLAYER mode. In EDIÇÃO mode (static frame) it shows a single representative cue (the first), not a rotation. `chunkText` may stay for any non-cue use, but the timed rotation hook is deleted.
  - **DEC: player only with `videoSource`.** No uploaded video → the canvas keeps today's static YouTube thumbnail + edit behavior; no play button. (Bootstrap restrição.)
  - **DEC (D-end): at `endSec` the player PAUSES (does not loop). Pressing play again RESTARTS from `startSec`** — NOT resume from `endSec` (else the click does nothing, since `currentTime` is already at the end). `useVideoPlayback.play()` checks: if `currentTime >= endSec` (or `< startSec`), seek to `startSec` first, then play. Rationale: the preview is for reviewing the assembled cut once, not looping; a loop on any card = constant motion distracting work on the others.
  - **DEC: `<video>` plays the full uploaded file but is clamped to `[startSec, endSec]`.** `currentTime` starts at `startSec` on play; on reaching `endSec` it pauses (and a subsequent play restarts from `startSec`). Cues are absolute-file-timeline (TASK_017), so they line up directly with `currentTime` — no offset math (see the cross-task TIME REFERENCE invariant).

### INVARIANTS
- **Must Maintain**:
  - **⏱ TIME REFERENCE (cross-task invariant — 016/017/018)**: all time is seconds ABSOLUTE on the full uploaded video file's timeline — the same scale as the transcript timestamps. A moment's `timestamp_start`/`timestamp_end` are absolute offsets into that file (e.g. 47:30 → 2850 s). In TASK_018 this means: `<video>.currentTime` is compared DIRECTLY against `cue.start`/`cue.end` with NO offset arithmetic; `play()` seeks to `startSec`; pause fires at `endSec`. If cues were relative-to-cut while `currentTime` is absolute (or vice-versa), the subtitle would never sync — this invariant forbids the mismatch.
  - `reference/viral-cristao-artifact.jsx` frozen
  - **`SubtitlePreview`'s public contract survives** — the arch-doc boundary table lists its interface; new props are ADDITIVE; existing `{ videoId, moment, subtitleConfig, videoConfig, overlayConfig, onVideoConfigChange, onSubtitleConfigChange }` keep working (a card with no `videoSource` renders exactly as today)
  - `App.jsx` is the single owner of `playingIndex`; `mode` is derived from `isConfigCollapsed` (no duplicate mode state); cards read via props, never cache
  - drag (`usePointerDrag`) is active ONLY in EDIÇÃO mode; PLAYER mode disables it (matches "drag desativado")
  - canvas stays the 1080×1920 reference system; `useCanvasMeasurement` + scaleFactor preserved
  - no new top-level primitive invented (consumes `SubtitleCue` from TASK_017, `VideoSource` from TASK_014)
  - **smoke:heap NOT triggered** — TASK_018 touches no file in [[smoke_heap_invariant_trigger_files]]; record "not triggered" in P3
  - Cognitive Complexity ≤ 15 per function/component (decompose SubtitlePreview sub-layers as needed)
  - Zero regressions across `pnpm test`
- **Quality Gates**:
  - `cueAt` selector: `t` before first cue → cue[0] or null (DEC); `t` inside cue k → cue k; `t` past last → last/null; empty cues → null
  - `SubtitlePreview`: with `videoSource` + PLAYER → renders `<video>` + play button; without `videoSource` → static thumbnail (today's render); EDIÇÃO → drag handlers present + static cue; PLAYER → drag absent; active cue text follows a stubbed `currentTime`
  - `MomentCard`: builds + passes cues; renders SubtitlePreview with the new props; existing tests stay green (additive props)
  - integration (App/ResultsView): play on card 1 → only card 1 active; play on card 2 → card 1 pauses; open a config tab → `playingIndex` becomes null (all paused); mode flips player↔edit with collapse
  - **Chrome DevTools MCP smoke**: upload a real MP4 → collapse panel (PLAYER) → play card 1 → subtitle advances with the video → play card 2 → card 1 stops → open a config tab → playback pauses + drag works. Screenshots of player(playing) + edit(static); console clean

## Task Definition
Make each card's 9:16 preview play the uploaded source video with the subtitle synced to the transcript timecodes. The config panel's collapse state doubles as a global mode switch (PLAYER when collapsed, EDIÇÃO when open); a single `playingIndex` in App enforces one-plays-at-a-time and opening any config tab pauses everything. Subtitle text is driven by `<video>.currentTime` → active `SubtitleCue`, replacing the arbitrary 2.2s rotation. Cards with no uploaded video keep today's static-thumbnail edit behavior.

## Success Criteria
1. With a `videoSource` uploaded and the panel collapsed, each card shows a central play button; clicking plays the `<video>` from `timestamp_start`
2. The subtitle text changes in step with the video at the transcript's own granularity (no 2.2s rotation anywhere)
3. Playing a second card stops the first (one-at-a-time)
4. Opening any config tab pauses playback and re-enables drag (EDIÇÃO)
5. A card with no `videoSource` renders exactly as today (static thumbnail, draggable) — no regression
6. The `N/M` chunk badge + `useChunkRotation` are gone
7. After the player pauses at `endSec`, pressing play again RESTARTS from `timestamp_start` (does not no-op at the end)
8. SonarCloud QG = PASS; `javascript:S3776 = 0`; MCP smoke screenshots captured; auditor AUDITORIA LIMPA

## Risk Assessment
| Risk | Level | Mitigation | Detection |
|---|---|---|---|
| Playback orchestration (one-at-a-time + mode + pause-on-config) is the most complex state in the app | HIGH | Single `playingIndex` SSOT in App + derived mode; no per-card play state; integration tests pin each transition | Integration tests + MCP smoke |
| `<video>` autoplay/seek policies vary; `currentTime` set before metadata loaded is lost | MEDIUM | Set `currentTime = startSec` on `loadedmetadata`; play on user gesture (play button) so no autoplay policy issue | MCP smoke |
| Subtitle sync jitter (cue lookup every `timeupdate` ~4Hz) | LOW | `timeupdate` is enough for phrase-level; `cueAt` is O(n) tiny; no rAF needed in Phase 5 | MCP smoke |
| `SubtitlePreview` refactor breaks the frozen-contract / existing tests | MEDIUM | Additive props only; the no-`videoSource` path renders today's output; existing SubtitlePreview tests kept | Component tests |
| Removing `useChunkRotation` orphans an import elsewhere | LOW | grep consumers before deleting; only SubtitlePreview uses it | grep + tests |
| Range request from `<video>` hits a TASK_016 bug | LOW | TASK_016 shipped + curl-verified before this task runs | Prereq gate |

## Implementation Strategy
1. **Tests first** — `cueAt` selector, `useVideoPlayback`, `SubtitlePreview` (player/edit/fallback/sync/drag-gate), `MomentCard` (cues), App/ResultsView integration (one-at-a-time, config-pauses)
2. Add `playingIndex` to App; derive `mode` from `isConfigCollapsed`; wire pause-on-config-open
3. Build `cueAt` + `useVideoPlayback`
4. Refactor `SubtitlePreview`: `<video>` + play button (PLAYER), static thumbnail (fallback/edit), cue-driven subtitle, drag gated by mode; remove chunk rotation + badge
5. Thread cues + mode + playingIndex through MomentCard / ResultsView
6. Delete `useChunkRotation` (+ test) after confirming no other consumer
7. Gates: lint, per-workspace coverage ([[pnpm_workspace_test_coverage_flake]]), `pnpm sonar` ([[sonar_env_sourcing]]); **smoke:heap N/A — record "not triggered"**
8. Chrome DevTools MCP smoke (real upload → play → sync → switch → config-pause); screenshots; auditor; PR

## Known follow-ups (NOT in scope of TASK_018)
- Word-level karaoke highlighting within a cue — Phase 5 shows whole-cue text; sub-cue highlight is a ROADMAP polish
- Scrubber / timeline UI on the card — deferred (Phase 7 timeline)
- Preload strategy for 5 simultaneous `<video>` elements — Phase 5 mounts `<video>` lazily per active player; revisit if memory bites

## Prerequisite Subtasks (MANDATORY)
### SUBTASK_018.P1: GitFlow
**Status**: ✅ Complete — branch `feature/task-018-play-subtitle-sync` from `develop`; commits `c423bfd (player)` + `6854cb7 (fix)`; Co-Authored-By trailer; PR → develop (open, awaiting human gate)
### SUBTASK_018.P2: Tests
**Status**: ✅ Complete — TDD/AAA; new hooks ≥ 80% (`cueAt` 100%, `useVideoPlayback` 100% lines / 95% branch); existing SubtitlePreview/MomentCard suites green (additive props; MomentCard redes-sociais negative assertion scoped to the tabpanel since the subtitle is now cue-driven); CC ≤ 15. web 188 / shared 51 / server 157 all green
### SUBTASK_018.P3: Finalization
**Status**: ✅ Complete — `pnpm lint` 0; per-workspace coverage; `pnpm sonar` QG **PASS**, `javascript:S3776` new-code = **0**, total new-code issues = **0**, new coverage 95.8%; Chrome DevTools MCP smoke captured (`memory_bank/tasks/evidence/task_018/`); black-box-auditor → AUDITORIA LIMPA; PR carries the SonarCloud block. **smoke:heap = NOT triggered** (frontend-only: touches none of upload route / video-storage / multipart-parser, per [[smoke_heap_invariant_trigger_files]])

## Subtasks (Pass 2 — executed)
- SUBTASK_018.1 — ✅ `lib/cueAt.js` pure selector + `hooks/useVideoPlayback.js` (callback ref; play sync in gesture, pause reactive; pause@endSec; restart-on-replay; reset clock on unmount; swallow benign play() rejection) + tests
- SUBTASK_018.2 — ✅ `SubtitlePreview` refactor (`<video>`/thumbnail, central play button, cue-driven subtitle, drag gated to edit, N/M badge removed) + test rewrite
- SUBTASK_018.3 — ✅ App `playingIndex` SSOT + derived `mode` + `handleCollapseChange` pause-on-edit chokepoint + ResultsView/MomentCard threading + integration tests (one-at-a-time, config-pause, mode flip, pause-at-cut-end)
- SUBTASK_018.4 — ✅ deleted `useChunkRotation`; MCP smoke + sonar + auditor + PR

## MCP smoke findings (real MP4 upload)
- **Network requests on PLAYER mount (the measurement requested at Pass 2): 5 `<video preload="metadata">` → 7 GET `/stream` requests, all 206 Partial Content.** 2 extra over 5 = the faststart `moov` fetch on a couple of elements; not a 5×N storm, view rendered fine. `preload="metadata"` fetches only the small metadata range (not the file), so this stays light on a real large source → **lazy-mount-only-active stays a follow-up, NOT promoted**. Decision was measured, not guessed.
- Behavior verified: one-plays-at-a-time (play card 1 → 4 buttons; play card 2 → card 1 restored), cue sync (t=68s → cue[0] "E eu fiz uma oração…", t=90s → cue[1] "E irmãos…"), config-open pauses everything (0 videos, thumbnails return), EDIÇÃO shows cue[0], console clean.
- Two smoke-caught fixes (commit `6854cb7`, both unit-pinned): swallow benign `play()` rejection (console-clean); reset `currentTime` on `<video>` unmount so EDIÇÃO shows cue[0] not the last-played position.

## SonarCloud (local `@sonar/scan` — repo has zero CI)
- Scan run: 2026-05-29 (analysisId `AZ50AYgySBqjfcpfUQt0`)
- Commit scanned: `6854cb7`
- Branch: `feature/task-018-play-subtitle-sync`
- Quality Gate: **PASS**
- New-code coverage: 95.8%
- New-code issues: 0 (Blocker: 0, Critical: 0, Major: 0)
- `javascript:S3776` (Cognitive Complexity) on new code: **0**
- new_security_hotspots_reviewed: 100% · new_duplicated_lines_density: 0.0%
