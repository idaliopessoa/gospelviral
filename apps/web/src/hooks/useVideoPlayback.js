import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Owns the per-card `<video>` element lifecycle for the active player.
 *
 * Two platform rules drive the shape (see project memory "video player state
 * model"):
 *  - PLAY is exposed as `play()` and MUST be called synchronously inside the
 *    user's click gesture — routing it through a state→effect chain would trip
 *    the browser autoplay policy (silent NotAllowedError).
 *  - PAUSE is reactive: when this card stops being the active player (or the
 *    cut reaches `endSec`), the hook pauses via effect / media event.
 *
 * The `<video>` mounts/unmounts as the card flips PLAYER↔EDIÇÃO, so the element
 * is tracked through a CALLBACK ref into state: listeners (re)attach whenever
 * the node mounts and detach on unmount. A plain `useRef` would capture `null`
 * on the first (edit-mode) render and never re-wire when the video later mounts.
 *
 * All times are seconds ABSOLUTE on the full file timeline (cross-task TIME
 * REFERENCE invariant), so `currentTime` lines up directly with the cues — no
 * offset math. `currentTime` is real state (from `timeupdate`); the active cue
 * is derived from it in render by the caller, never mirrored into state here.
 *
 * @param {object} opts
 * @param {number} opts.startSec        cut start (seek target)
 * @param {number} opts.endSec          cut end (pause point, exclusive upper bound)
 * @param {boolean} opts.isActivePlayer this card is the one currently playing
 * @param {() => void} [opts.onReachEnd] fired once when playback reaches endSec
 * @returns {{ videoRef: (node: HTMLVideoElement|null) => void, currentTime: number, play: () => void }}
 */
export function useVideoPlayback({ startSec, endSec, isActivePlayer, onReachEnd }) {
  const [videoEl, setVideoEl] = useState(null);
  const [currentTime, setCurrentTime] = useState(startSec);
  // Keep the latest callback without re-attaching media listeners every render.
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;

  // Callback ref — fires with the node on mount and with null on unmount.
  const videoRef = useCallback((node) => setVideoEl(node), []);

  const play = useCallback(() => {
    if (!videoEl) return;
    // Restart from the cut start when out of range (before start, or replay
    // after pausing at the end) — never a no-op resume at endSec.
    if (videoEl.currentTime < startSec || videoEl.currentTime >= endSec) {
      videoEl.currentTime = startSec;
    }
    videoEl.play();
  }, [videoEl, startSec, endSec]);

  // Reactive pause: a card that is not the active player must not be playing.
  useEffect(() => {
    if (!videoEl) return;
    if (!isActivePlayer) videoEl.pause();
  }, [videoEl, isActivePlayer]);

  // Media listeners — (re)attached whenever the element or [startSec, endSec] change.
  useEffect(() => {
    if (!videoEl) return undefined;
    function handleLoadedMetadata() {
      videoEl.currentTime = startSec;
      setCurrentTime(startSec);
    }
    function handleTimeUpdate() {
      const t = videoEl.currentTime;
      setCurrentTime(t);
      if (t >= endSec) {
        videoEl.pause();
        onReachEndRef.current?.();
      }
    }
    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoEl, startSec, endSec]);

  return { videoRef, currentTime, play };
}
