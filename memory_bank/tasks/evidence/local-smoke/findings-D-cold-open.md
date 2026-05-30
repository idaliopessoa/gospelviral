# Findings D — Cold open playback model (D6)

> Persisted by the parent (subagent Write was blocked). Persona: 01-Systems-Architecture-Expert.

## Desired model (segment sequence)
Today `useVideoPlayback` plays ONE linear segment `[startSec,endSec]`. D6 needs a segment SEQUENCE:
```
segments = decision==='apply_cold_open' && coldOpen valid
  ? [ {start: coldOpen.start, end: coldOpen.end},  // (1) peak teaser
      {start: cutStart,        end: cutEnd} ]        // (2) full cut (replays peak in context)
  : [ {start: cutStart, end: cutEnd} ]               // keep_linear / no valid cold open
```
Real #1: cut 5305→5353, peak 5323→5340. Order: (1) 5323→5340, seek back, (2) 5305→5353, pause. Peak is a SUBSET of the cut → plays twice. A segment is just `{start,end}` in the existing absolute-seconds timeline — **composition, not a new primitive**. `keep_linear`/no-cold-open collapse to `[fullCut]` = current single-segment path.

## peak_moment parsing + schema friction
All 5 reals: `apply_cold_open`, `peak_moment.timestamp` = RANGE string `"01:28:43-01:29:00"` (example fixture uses `MM:SS` form `"01:08-01:25"`). `moment.cold_open` is `undefined` everywhere — only `cold_open_analysis.decision` set (`MomentCard.isColdOpen` already dual-checks). **The prompt (`prompts.js:105`) already mandates the `MM:SS-MM:SS` range form** → real contract; only the `types.js:83` typedef is wrong (calls it a single timestamp) = doc drift.
**Verified trap:** `timestampToSeconds("01:28:43-01:29:00")` → **0** (substring `"43-01"`→NaN→guard 0). Split on `-` FIRST: `"01:28:43"`→5323, `"01:29:00"`→5340 (works for HH:MM:SS and MM:SS halves).
**Recommendation:** cold-open range is DERIVED, not a new primitive — `{start,end}` absolute seconds (same shape as a segment / SubtitleCue). New pure helper in `packages/shared/` (home of time.js): `parseColdOpenRange(peakString) → {start,end}|null` (null on missing/no-dash/unparseable/end<=start). SINGLE place that knows `"A-B"` syntax.

## useVideoPlayback interface extension (multi-segment)
Current: `useVideoPlayback({startSec,endSec,isActivePlayer,onReachEnd}) → {videoRef,currentTime,play}`.
Proposed: `useVideoPlayback({segments, isActivePlayer, onReachEnd}) → {videoRef,currentTime,play}` (segments: Array<{start,end}>, ≥1, absolute, play in order). **Return shape UNCHANGED.**
Migration: **(A) replace startSec/endSec with segments** (exactly ONE caller `SubtitlePreview` → SSOT for input shape; single-segment = `[{start,end}]`). (B) overload possible but fuzzier.
Internal: new state `segmentIndex` (0). Active = `segments[segmentIndex]` drives existing seek/pause. `play()` synchronous in gesture, resets index 0, seeks segments[0].start, swallows rejection. `timeupdate`: `currentTime >= active.end` → next exists? `segmentIndex++` + seek next.start, keep playing (NO pause, NO onReachEnd); else pause + onReachEnd ONCE. Pause reactive unchanged. Unmount → reset segments[0].start.
**CC≤15:** extract pure `advanceSegment(currentTime, segments, idx) → {nextIndex, seekTo|null, reachedEnd}` + `buildPlaybackSegments(moment, coldOpenRange) → segments[]` (SSOT for cold-open-first ordering) + `parseColdOpenRange`.

## Subtitle/cue alignment across passes
**No offset math; cueAt/buildSubtitleCues UNCHANGED.** Cues span the full cut in absolute seconds; peak is a subset → same cue object active in both passes; at peak-end→cut-start seek the subtitle jumps back to the cut's opening cue. Optional `isColdOpenPhase` (segmentIndex===0 && length>1) for a future "teaser" badge — recommend none v1.

## Transitions & edge cases
Cold-open end → advance/seek cutStart/continue. Full-cut end → pause + onReachEnd once. keep_linear/missing/malformed/zero-len/inverted → parseColdOpenRange null → `[fullCut]`. Peak outside cut (spec assumes ⊆; all 5 reals satisfy) → robust either way; decide trust-as-is (rec) vs clamp vs invalidate. Peak==cut → optional collapse. Whole-string parse trap → regression test.

## Affected black-boxes
NEW: `parseColdOpenRange` (shared), `buildPlaybackSegments`, `advanceSegment` (pure). CHANGED: `useVideoPlayback` (param startSec/endSec→segments; internal segmentIndex; return unchanged), `SubtitlePreview` (compute+pass segments; props unchanged), `types.js` (tighten peak_moment JSDoc — doc only). NO change: cueAt/buildSubtitleCues/MomentCard/ResultsView/App.

## Invariants
Absolute TIME REFERENCE; `segments.length===1` reproduces pre-D6 exactly (12 hook tests pass after harness update); autoplay-safe play() resets to segments[0]; pause reactive + one-at-a-time; cue derived in render; onReachEnd once at LAST segment; partial cold open → linear fallback; `buildPlaybackSegments` SSOT for ordering.

## Risks
- **HIGH** silent `0` from `timestampToSeconds(rangeString)` if any path forgets to split → cold open jumps to file start. Mitigate: single `parseColdOpenRange` entry + regression test.
- **MED** backward seek (cut starts before peak) on 1.56GB non-faststart → fresh 206 + visible stall at transition (TASK_016 territory).
- **MED** replay restarts at cold open (matches spec; document).
- **LOW** unmount frame = peak-start for cold-open moments; CC creep; peak⊄cut/peak==cut = product decisions.

## Test matrix (AAA) — highlights
Pure: parseColdOpenRange `"01:28:43-01:29:00"`→{5323,5340}; `"01:08-01:25"`→{68,85}; undefined/""/no-dash/inverted/zero-len/NaN→null; regression `timestampToSeconds(wholeRange)===0`; buildPlaybackSegments apply→[{5323,5340},{5305,5353}], keep_linear→[{cut}], apply+null-parse→[{cut}]; advanceSegment inside→no-op, at seg0.end→seek seg1.start not-ended, at last.end→reachedEnd.
Hook (harness passes segments): single-segment back-compat; play() seeks segments[0].start; timeupdate seg0.end→seek seg1.start no pause/onReachEnd; seg1.end→pause+onReachEnd once; replay resets seg0; unmount resets segments[0].start; reactive pause; play() rejection swallowed.

## Open decisions for the human
1. Tighten `peak_moment.timestamp` typedef to range (do now); server-normalize peak to `{start,end}`? (rec defer — client `parseColdOpenRange` isolates). Surface a real `cold_open` boolean vs rely on `decision`?
2. Param migration A (replace, rec) vs B (overload).
3. Phase indicator badge? (rec none v1).
4. peak⊄cut policy (trust-as-is rec).
5. peak==cut collapse?
6. Backward-seek stall — accept v1 or couple with TASK_016.
7. Confirm replay restarts at cold open.
