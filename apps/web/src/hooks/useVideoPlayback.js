import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceSegment } from '@gospelviral/shared';

/**
 * Owns the per-card `<video>` element lifecycle for the active player.
 *
 * Plays an ordered SEQUENCE of segments (D6 — TASK_019). A single-segment
 * `[{start, end}]` reproduces the pre-D6 linear cut exactly; an
 * `apply_cold_open` moment passes `[peak, fullCut]` so the peak teaser plays
 * first and the full cut replays it in context. The `<video>` runs continuously
 * across segment boundaries — at a non-last segment's end the hook seeks to the
 * next segment's start and keeps playing; only the LAST segment pauses + fires
 * `onReachEnd`.
 *
 * Two platform rules drive the shape (see project memory "video player state
 * model"):
 *  - PLAY is exposed as `play()`/`toggle()` and MUST be called synchronously
 *    inside the user's click gesture — routing it through a state→effect chain
 *    would trip the browser autoplay policy (silent NotAllowedError).
 *  - PAUSE is reactive: when this card stops being the active player (or the
 *    sequence ends), the hook pauses via effect / media event.
 *
 * D2: `pause()`/`toggle()`/`isPlaying` are ADDITIVE. The card stays the active
 * player while paused (paused-but-active — `playingIndex` SSOT in App is
 * untouched); `isPlaying` is event-driven off the `<video>` (play/playing/
 * pause/ended), never optimistically set on click, so it survives a rejected
 * play(). Resume is in place (no reseek) when paused inside the active segment.
 *
 * The `<video>` mounts/unmounts as the card flips PLAYER↔EDIÇÃO, so the element
 * is tracked through a CALLBACK ref into state: listeners (re)attach whenever
 * the node mounts and detach on unmount.
 *
 * All times are seconds ABSOLUTE on the full file timeline (cross-task TIME
 * REFERENCE invariant) — `currentTime` lines up directly with the cues, no
 * offset math. `currentTime` is real state (from `timeupdate`); the active cue
 * is derived from it in render by the caller, never mirrored into state here.
 * `segmentIndex` is internal (a ref) — the caller derives the subtitle from
 * `currentTime`, never from the segment index.
 *
 * @param {object} opts
 * @param {Array<{start: number, end: number}>} opts.segments ordered, ≥1, absolute seconds
 * @param {boolean} opts.isActivePlayer this card is the one currently playing
 * @param {() => void} [opts.onReachEnd] fired once when the LAST segment ends
 * @returns {{ videoRef: (node: HTMLVideoElement|null) => void, currentTime: number,
 *   play: () => void, pause: () => void, toggle: () => void, isPlaying: boolean }}
 */
export function useVideoPlayback({ segments, isActivePlayer, onReachEnd }) {
  const [videoEl, setVideoEl] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => segments[0]?.start ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Latest values without re-attaching media listeners every render. segments
  // is read live so a fresh array identity per render never thrashes listeners.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;
  // Internal playhead into `segments` — a ref, never surfaced (caller derives
  // the subtitle from currentTime, not from the segment index).
  const segmentIndexRef = useRef(0);

  // Callback ref — fires with the node on mount and with null on unmount.
  const videoRef = useCallback((node) => setVideoEl(node), []);

  const play = useCallback(() => {
    if (!videoEl) return;
    const active = segmentsRef.current[segmentIndexRef.current];
    // Resume in place when paused INSIDE the active segment (D2 — no reseek).
    // Otherwise (fresh start, or replay after the last segment ended) restart
    // from the first segment (D6 — cold open replays from the peak).
    if (videoEl.currentTime < active.start || videoEl.currentTime >= active.end) {
      segmentIndexRef.current = 0;
      videoEl.currentTime = segmentsRef.current[0].start;
    }
    // play() rejects on autoplay-policy denial or when interrupted by an
    // immediate pause() (switching cards) — both benign; swallow.
    const started = videoEl.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  }, [videoEl]);

  const pause = useCallback(() => {
    videoEl?.pause();
  }, [videoEl]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play(); // synchronous within the gesture — autoplay-safe
  }, [isPlaying, play, pause]);

  // When the <video> unmounts (back to EDIÇÃO, or no source) reset the clock so
  // the static subtitle shows the representative first cue (cueAt → cue[0]).
  useEffect(() => {
    if (!videoEl) {
      segmentIndexRef.current = 0;
      setCurrentTime(segmentsRef.current[0].start);
    }
  }, [videoEl]);

  // Reactive pause: a card that is not the active player must not be playing.
  useEffect(() => {
    if (!videoEl) return;
    if (!isActivePlayer) videoEl.pause();
  }, [videoEl, isActivePlayer]);

  // Media listeners — attached when the element mounts, detached on unmount.
  useEffect(() => {
    if (!videoEl) return undefined;
    function handleLoadedMetadata() {
      segmentIndexRef.current = 0;
      videoEl.currentTime = segmentsRef.current[0].start;
      setCurrentTime(segmentsRef.current[0].start);
    }
    function handleTimeUpdate() {
      const t = videoEl.currentTime;
      setCurrentTime(t);
      const { nextIndex, seekTo, reachedEnd } = advanceSegment(
        t,
        segmentsRef.current,
        segmentIndexRef.current,
      );
      if (reachedEnd) {
        videoEl.pause();
        onReachEndRef.current?.();
        return;
      }
      if (nextIndex !== segmentIndexRef.current) {
        segmentIndexRef.current = nextIndex;
        if (seekTo !== null) videoEl.currentTime = seekTo;
      }
    }
    const markPlaying = () => setIsPlaying(true);
    const markPaused = () => setIsPlaying(false);
    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('play', markPlaying);
    videoEl.addEventListener('playing', markPlaying);
    videoEl.addEventListener('pause', markPaused);
    videoEl.addEventListener('ended', markPaused);
    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('play', markPlaying);
      videoEl.removeEventListener('playing', markPlaying);
      videoEl.removeEventListener('pause', markPaused);
      videoEl.removeEventListener('ended', markPaused);
    };
  }, [videoEl]);

  return { videoRef, currentTime, play, pause, toggle, isPlaying };
}
