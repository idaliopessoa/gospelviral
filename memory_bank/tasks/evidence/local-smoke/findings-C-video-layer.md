# Findings C — Video layer & playback gesture (D1 + D2)

> Persona: `01-Systems-Architecture-Expert-viral-cristao.md`. READ-ONLY insumos for the TASK_018 follow-up (e.g. TASK_019). NO code changed. Scope: D1 (YouTube cover persists in EDIÇÃO) + D2 (player only plays, never pauses). Sibling brief: `task_018_defects_common_evidence.md`.

Files studied (all absolute):
- `apps/web/src/components/SubtitlePreview.jsx` — `VideoLayer`, `PlayButton`, `hasVideo`/`editable`/`showPlayButton`, drag gating, z-order, `handlePlayClick`.
- `apps/web/src/hooks/useVideoPlayback.js` — play/pause/seek lifecycle, callback ref, reactive pause, end-of-cut pause.
- `apps/web/src/hooks/usePointerDrag.js` — drag gated by `onCommit` being defined (`if (!onCommit) return` in `onPointerDown`).
- `apps/web/src/App.jsx` — `playingIndex` SSOT, `mode` derived from `isConfigCollapsed`, `handleCollapseChange` pause-on-edit chokepoint.
- `apps/web/src/views/ResultsView.jsx` — threading (`isActivePlayer`, `onRequestPlay`, `onPlaybackEnd`).
- `apps/web/src/components/MomentCard.jsx` — builds `cues`, threads playback props into `SubtitlePreview`.
- Tests: `SubtitlePreview.test.jsx`, `useVideoPlayback.test.jsx`, `App.playback.test.jsx`.

---

## D1 proposal + implications

### Current behavior (the bug)
`SubtitlePreview` line 195: `const hasVideo = Boolean(videoSource) && mode === 'player';`
`VideoLayer` renders `<video>` only when `hasVideo`; otherwise the YouTube `<img>` thumbnail. So in EDIÇÃO (`mode === 'edit'`) with a real `videoSource` uploaded, the card still shows the **YouTube cover**, not the uploaded video. The user wants the uploaded clip's poster frame visible while positioning the overlay/subtitle in edit mode.

### Proposed rule
Drop the `mode` condition from the video-presence test:

```js
const hasVideo = Boolean(videoSource);   // was: Boolean(videoSource) && mode === 'player'
```

Result: once a `videoSource` exists, `<video>` renders in **both** modes (paused poster frame seeked to `startSec`); the YouTube `<img>` thumbnail becomes the **no-`videoSource` fallback only**. Drag stays gated to EDIÇÃO; play affordance stays gated to PLAYER (see Open decision 3).

### Implications — verified against the code

1. **Poster frame in edit works.** `<video preload="metadata">` fires `loadedmetadata`; the existing listener (`useVideoPlayback`, lines 69–89) seeks to `startSec` and sets `currentTime`. The listener effect is wired through the **callback ref**, which fires when the node mounts regardless of mode — so a video mounted in EDIÇÃO gets its listeners and seeks to `startSec`. Confirmed wanted: a paused poster frame at the cut start.

2. **No autoplay in edit.** Nothing calls `.play()` outside the click gesture; `<video>` has no `autoplay` attribute. The reactive-pause effect (lines 63–66) additionally calls `pause()` whenever `!isActivePlayer`, and in EDIÇÃO `isActivePlayer` is always `false` (`handleCollapseChange` clears `playingIndex` on entering edit — App.jsx 123–126). So an edit-mode video is doubly guaranteed paused. Autoplay-safety preserved.

3. **Drag on the `<video>` still works in edit.** Drag lives on the **wrapper `div`** (`VideoLayer`, lines 53–64), not on the media element; the `<video>` itself is `pointer-events-none` (line 71). `usePointerDrag` activates purely on `onCommit` being defined, which `SubtitlePreview` sets only when `editable` (lines 208–212). The presence of a `<video>` vs `<img>` child does not affect the wrapper's pointer handlers. Drag math unaffected — no regression to the two drag tests.

4. **z-order / overlay unchanged.** `VideoLayer` is the base layer; `OverlayLayer` z-10, `SubtitleLayer` z-20, `PlayButton` z-30. Swapping `<img>` for `<video>` at the base does not change stacking. (See Risk 2 re overlay covering the video.)

### Test impact (one existing test MUST flip — by design)
`SubtitlePreview.test.jsx`, **"renders the static thumbnail in edit mode even with a videoSource"** (lines 98–105) asserts the OLD behavior and will now fail. This test encodes the bug; the follow-up must **rewrite** it to assert the new contract: *with a `videoSource`, edit mode renders `<video>` (not the YouTube `<img>`)*. The two no-`videoSource` thumbnail tests (89–96, plus App-level) stay green. Intentional contract change, not a silent regression — flag in the task invariants.

### Black-box surface
`SubtitlePreview` props unchanged. Pure internal rewrite of one boolean (`hasVideo`). `VideoLayer`'s `hasVideo` prop keeps its meaning ("render `<video>` vs thumbnail"); only its computation moves. Replaceable: yes — interface identical.

---

## D2 pause/toggle design (state model, interaction with playingIndex)

### Current behavior (the bug)
- `useVideoPlayback` exposes `{ videoRef, currentTime, play }` — **no pause/toggle** (line 91).
- `PlayButton` shows only when `showPlayButton = hasVideo && !isActivePlayer` (line 227). While a card is the active player there is NO affordance: the `<video>` is `pointer-events-none`, the play button is gone, clicking the card does nothing.
- Pause happens only reactively (switch cards, or flip to EDIÇÃO via `handleCollapseChange`) or automatically at `endSec`.

### Core question: what does "this card is playing" mean?
Today `isActivePlayer` (= `playingIndex === i`) doubles as "this is THE active card" **and** "this card is rolling". Once we add in-place pause, those facts diverge: a card can be active **and paused**. We need a derived "is actually playing now" signal distinct from "is the active card".

### Chosen state model — Option (a): paused-but-active, with a derived `isPlaying`

**SSOT stays exactly as is.** `playingIndex` in `App.jsx` remains the one-at-a-time selector ("which card owns the player"). We do NOT add a second piece of global state for play/pause. The moment-to-moment playing/paused fact is owned locally by the `<video>` element (the DOM `paused` property) and surfaced as derived state out of `useVideoPlayback`. Respects SSOT: the media element is the natural owner of "am I rolling"; mirroring it into React global state would create a second truth that drifts (the persona doc's "synchronization logic" red flag).

**`useVideoPlayback` becomes additive:**
```js
return { videoRef, currentTime, isPlaying, play, pause, toggle };
```
- `isPlaying` — React state mirrored from the element via `play`/`playing`/`pause`/`ended` media events (event-driven, same pattern as `currentTime`; NOT a polling useEffect).
- `pause()` — `videoEl?.pause()`. Reactive/imperative; no autoplay concern.
- `toggle()` — `isPlaying ? pause() : play()`. **The `play()` branch MUST stay synchronous in the gesture** (existing autoplay-safety rule: `play()` is gesture-bound, `pause()` is free). `toggle` is invoked directly from `onClick`, so the `play()` branch stays inside the user gesture — safe.

**Why keep `playingIndex` on pause (Option a, not b = `pause → setPlayingIndex(null)`):**
- **One-at-a-time preserved trivially.** While paused, the card stays `isActivePlayer`, so every OTHER card's reactive-pause effect holds them paused and their play buttons show. No second active card possible.
- **Resume is in-place and instant.** Clicking again resumes from the paused `currentTime` (no reseek — `play()` only reseeks when out of `[startSec, endSec)`), the natural UX. Option (b) would re-fire `onRequestPlay` on resume and muddy the button logic / lose the "chosen card" framing.
- **Edit-flip still pauses everything.** `handleCollapseChange(false)` clears `playingIndex`; the reactive-pause effect then pauses the now-non-active video. Untouched.

### Click-to-toggle affordance
Two parts:

1. **Affordance visibility** flips from "not active" to "**not actually playing**":
   ```js
   const showPlayButton = hasVideo && mode === 'player' && !isPlaying;  // see Open decision 3
   ```
   The play/resume button reappears whenever paused — paused-but-active (resume) AND paused-at-`endSec`. This satisfies the existing App test "play button reappears at endSec" (end pause → `isPlaying=false` → button shows).

2. **Clicking the rolling video pauses it.** While `isPlaying` the play glyph is hidden, so a pause affordance must sit on the playing surface. Preferred: **transparent full-bleed toggle button (z-30)**, symmetric with `PlayButton`, keeps the `<video>` `pointer-events-none`, mobile-safe (a real `<button>`, not a video-tap). Reject making the `<video>` clickable (it's deliberately `pointer-events-none` so it never eats drag). Cleanest: a single `PlaybackToggleButton` driven by `isPlaying` (swap play↔pause glyph), replacing the play-only `PlayButton`.

### `SubtitlePreview.handlePlayClick` becomes a toggle
```js
function handleToggle() {
  if (isPlaying) {
    pause();                 // reactive; playingIndex unchanged (paused-but-active)
  } else {
    play();                  // synchronous in gesture — autoplay-safe
    onRequestPlay?.();       // claim the global player slot
  }
}
```
`onRequestPlay` fires only on the play branch (idempotent / cheap `setPlayingIndex(i)`).

---

## Affected black-boxes / interface

| Black box | Change | Contract impact |
|---|---|---|
| `SubtitlePreview` (props) | none | **Survives unchanged.** All edits internal. |
| `VideoLayer` (internal) | `hasVideo` computation; toggle button vs play-only | Internal — not part of the public contract. |
| `useVideoPlayback` (return) | `{ ...prev, isPlaying, pause, toggle }` | **Additive only.** Existing `videoRef`/`currentTime`/`play` untouched → no breaking change. Hook's job unchanged in spirit. |
| `App.jsx` `playingIndex` SSOT | **unchanged** | Pause does NOT clear `playingIndex` (Option a). |
| `ResultsView` threading | unchanged | `isActivePlayer`/`onRequestPlay`/`onPlaybackEnd` still suffice. |
| `MomentCard` | unchanged | No new props. |

No new primitive. No new top-level state. `playingIndex` stays the single source of "who owns the player"; `<video>.paused`/`isPlaying` is the single source of "rolling vs paused", owned where the truth physically lives and surfaced via the hook.

---

## SSOT notes

- **"Which card is active"** → `App.jsx` `playingIndex` (unchanged), threaded as `isActivePlayer`.
- **"Is the active card rolling or paused"** → the `<video>` element, surfaced as `isPlaying`. Do NOT promote to App-level global: only the active card can play (guaranteed by `playingIndex` + reactive pause), so no cross-card coordination needs a global; promoting it would create a second truth to sync with the DOM (persona §6 / red flags).
- **"Video presence"** → derived from `videoSource` alone after D1 (was `videoSource && mode`). `videoSource` SSOT remains `App.jsx` (session-only).
- **Edit-mode pause** stays funneled through the single chokepoint `handleCollapseChange` — D2 adds no second pause path that bypasses it.

---

## Invariants (must hold after the change)

1. **Autoplay-safety** — every `play()` (including the resume branch of `toggle`) runs **synchronously inside the click gesture**. `pause()` may be reactive/async. Keep `play()` off any state→effect indirection.
2. **One-plays-at-a-time** — at most one card is `isActivePlayer`; all others reactively paused. `playingIndex` is still the single selector; pause does not create a second active card.
3. **D1: video presence ⇔ `videoSource`** — `<video>` renders iff `videoSource` set, both modes; YouTube `<img>` only when no `videoSource`.
4. **Edit mode never plays** — `isActivePlayer` always false in edit (playingIndex cleared on collapse=false), so the edit-mode video is the paused `startSec` poster.
5. **End-of-cut pause** — reaching `endSec` pauses + fires `onReachEnd` (→ `setPlayingIndex(null)`); the toggle/play button reappears. Preserved.
6. **CC ≤ 15** (`javascript:S3776`). `handleToggle` (one branch), `toggle`/`pause` (trivial), `showPlayButton` (one boolean) — all far under. No nested branching added.

---

## Risks / edge cases

1. **Edit↔player flip while paused-but-active.** Play card 1, pause it (still `playingIndex=1`), then open a config tab. `handleCollapseChange(false)` clears `playingIndex`; the reactive-pause effect pauses the already-paused video (no-op). On re-collapse, `playingIndex` null → all idle, toggle shows play glyph. Verify: a paused-but-active card flipping to edit ends paused with `playingIndex=null` (no stuck-active).
2. **Overlay covering the video (cross-cutting perception).** With an opaque overlay PNG at 100%, a now-visible edit-mode video (D1) is still hidden behind the overlay — same as today's player mode. Not a regression, but D1's "see the poster frame" benefit is muted when overlay is opaque (overlay opacity is a separate control — note for the user). The toggle button is z-30, above the overlay (z-10), so the affordance stays clickable.
3. **Mobile touch.** Keep the toggle as a real `<button>` (transparent overlay), not a tap on the `pointer-events-none` `<video>` — avoids the iOS "tap video → native controls/fullscreen" trap. `playsInline` already set (line 70) — preserve it.
4. **`isPlaying` initial value & rejected play().** Initialize `isPlaying=false`. `play()` may reject (autoplay denial / interrupted by switching cards — already swallowed). Derive `isPlaying` from the element's `play`/`playing`/`pause`/`ended` events, NOT optimistically from the click; otherwise the button could show "pause" over a video that never started.
5. **Pause-at-end vs user-pause both = `isPlaying=false`.** Both correctly show the play/resume button. At `endSec` the hook also fires `onReachEnd`→`setPlayingIndex(null)`, so the card is no longer active AND not playing → resume re-claims via `onRequestPlay` + reseek-to-start (currentTime>=endSec triggers the restart branch). Consistent.
6. **Double-mount cost.** After D1, all 5 cards mount a `<video preload="metadata">` in edit mode (5 metadata fetches against the 1.56 GB file via the stream route, which currently serves `bytes=0-` toward EOF — cross-cutting inefficiency in the brief). `preload="metadata"` should fetch only moov/header, but with a non-faststart (moov-at-end) file the browser may range-read late bytes. Flag: D1 multiplies metadata requests x5; pair with the stream-route fix (TASK_016) or consider `preload="none"` + load-on-demand. Run `smoke:heap` if the upload/stream route is touched (project memory invariant).

---

## Test matrix (AAA) — write BEFORE implementation

### `SubtitlePreview.test.jsx`
- **D1 (rewrite existing "static thumbnail in edit"):** Arrange `videoSource` + `mode='edit'`; Act render; Assert `getByTestId('video-el')` present AND no `img[src*="img.youtube.com"]`.
- **D1 keep:** no `videoSource` + edit → YouTube `<img>`, no `video-el`.
- **D1 keep:** no `videoSource` + player → YouTube `<img>`.
- **D1 poster:** `videoSource` + edit, fire `loadedmetadata` → `video.currentTime === startSec`.
- **D1 drag preserved:** `videoSource` + edit → video-layer pointer drag still commits canvas-px (existing drag test, now with a `<video>` child).
- **D2 toggle pauses:** `videoSource` + player + `isActivePlayer` + simulate playing → click toggle → Assert `pause` called AND `onRequestPlay` NOT called on the pause branch.
- **D2 toggle resumes:** paused-but-active → click toggle → Assert `play` called (synchronously) AND `onRequestPlay` called.
- **D2 button visibility:** active + playing → no play-glyph (or pause-glyph shown); active + paused → play/resume affordance present.
- **D2 keep:** no `videoSource` → no toggle/play button.

### `useVideoPlayback.test.jsx`
- **isPlaying false initially:** render → Assert `isPlaying === false`.
- **play() flips isPlaying true:** Act `play()` + fire `playing`/`play`; Assert true.
- **pause() flips isPlaying false:** playing → `pause()` + fire `pause`; Assert false.
- **toggle() routes:** paused→`play` called; playing→`pause` called.
- **end-of-cut sets isPlaying false:** `timeupdate` to `endSec`; Assert pause + `isPlaying===false` + `onReachEnd` once.
- **resume after pause does NOT reseek:** pause mid-cut at t=14; toggle/play; Assert `currentTime` stays 14.
- **resume after end DOES reseek to startSec:** paused at `endSec`; play; Assert `currentTime===startSec` (existing restart test).
- **keep all existing tests green** (additive return shape).

### `App.playback.test.jsx`
- **D2 in-place pause one card:** PLAYER, play card 1, click its toggle again → card 1 paused, `playingIndex` still 1, other cards still show play buttons, resume affordance on card 1.
- **D2 resume same card:** after pausing card 1, click again → `play` called, no reseek, card 1 active.
- **Keep:** one-at-a-time across cards.
- **Keep:** opening config tab pauses everything + clears playingIndex.
- **Keep:** pause-at-end reappears affordance (now via `isPlaying`).
- **D1 in App:** uploaded video + EDIÇÃO → every card shows `video-el` (not YouTube `<img>`); collapse → still `video-el`. Verify existing "no play button in edit / 5 in player" stays valid (gate toggle to PLAYER per Open decision 3).

---

## Open decisions (for the user / task author)

1. **`isPlaying` source of truth:** event-driven from the media element (`play`/`playing`/`pause`/`ended`) — RECOMMENDED, mirrors `currentTime`, survives rejected `play()`. Confirm we do NOT optimistically set `isPlaying=true` on click.
2. **D2 affordance style:** single transparent full-bleed toggle button (z-30) swapping play↔pause glyph (RECOMMENDED, symmetric, mobile-safe) vs two distinct buttons vs clickable `<video>`. Decide the visual (pause glyph while playing, or invisible hit-area + play glyph only on pause?).
3. **Edit-mode play affordance:** after D1 the video exists in edit but must NOT be playable (edit is for positioning). Confirm rule: toggle/play gated to **PLAYER mode only** (`hasVideo && mode === 'player' && !isPlaying`), so edit shows the poster frame with NO play affordance (drag-only) — keeps the existing App test "no play button in EDIÇÃO" valid and prevents starting playback while editing.
4. **Pause semantics, end vs user-pause:** confirm both show the SAME play/resume button (user-pause resumes in place via no-reseek; end-pause restarts via reseek). The out-of-range logic in `play()` gives this for free.
5. **D1 `preload` strategy:** `preload="metadata"` x5 cards vs `preload="none"` + lazy. Tie to the stream-route efficiency fix (TASK_016) and the `smoke:heap` invariant if the upload route is touched.
