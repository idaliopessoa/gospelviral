import { timestampToSeconds } from './time.js';

/**
 * Cold-open playback model (D6 — TASK_019). A moment can play as a SEQUENCE of
 * segments rather than one linear cut: an `apply_cold_open` moment teases the
 * peak window first, then plays the full cut (so the peak replays in context).
 * A segment is just `{ start, end }` in the existing absolute-seconds file
 * timeline — composition over the SubtitleCue/cut primitives, not a new one.
 *
 * Pure / deterministic — no DOM, no Date, no randomness.
 */

/**
 * Parse a cold-open peak RANGE string (`"A-B"`, each side `MM:SS` or
 * `HH:MM:SS`) into absolute seconds. Splits on the FIRST dash BEFORE calling
 * `timestampToSeconds` — passing the whole `"01:28:43-01:29:00"` string to
 * `timestampToSeconds` returns 0 (the `"43-01"` part is NaN-guarded to 0), which
 * would silently jump the cold open to the start of the file. This is the one
 * place that understands the `"A-B"` syntax.
 *
 * @param {string} peakString e.g. "01:28:43-01:29:00" or "01:08-01:25"
 * @returns {{start: number, end: number}|null} null on missing / no-dash /
 *   unparseable / non-positive-length range
 */
export function parseColdOpenRange(peakString) {
  if (typeof peakString !== 'string') return null;
  const dash = peakString.indexOf('-');
  if (dash === -1) return null;
  const startStr = peakString.slice(0, dash).trim();
  const endStr = peakString.slice(dash + 1).trim();
  if (startStr === '' || endStr === '') return null;
  const start = timestampToSeconds(startStr);
  const end = timestampToSeconds(endStr);
  if (end <= start) return null;
  return { start, end };
}

/**
 * Build the ordered playback segments for a moment (SSOT for cold-open-first
 * ordering). `apply_cold_open` with a valid parsed range → `[peak, fullCut]`;
 * anything else (`keep_linear`, missing/malformed range) → `[fullCut]` — which
 * is exactly the pre-D6 single-segment path.
 *
 * @param {import('./types.js').Moment} moment
 * @param {{start: number, end: number}|null} coldOpenRange parsed peak range
 * @returns {Array<{start: number, end: number}>} ≥1 segment, absolute seconds
 */
export function buildPlaybackSegments(moment, coldOpenRange) {
  const cut = {
    start: timestampToSeconds(moment.timestamp_start),
    end: timestampToSeconds(moment.timestamp_end),
  };
  const decision = moment?.cold_open_analysis?.decision;
  if (decision === 'apply_cold_open' && coldOpenRange) {
    return [{ start: coldOpenRange.start, end: coldOpenRange.end }, cut];
  }
  return [cut];
}

/**
 * Decide the playback transition at `currentTime` for the active segment `idx`.
 * Inside the active segment → no-op. At/after its end → advance to the next
 * segment (seek to its start, keep playing) or, if it was the LAST segment,
 * signal the end (caller pauses + fires onReachEnd ONCE).
 *
 * @param {number} currentTime seconds, absolute file timeline
 * @param {Array<{start: number, end: number}>} segments
 * @param {number} idx active segment index
 * @returns {{nextIndex: number, seekTo: number|null, reachedEnd: boolean}}
 */
export function advanceSegment(currentTime, segments, idx) {
  const active = segments[idx];
  if (currentTime < active.end) {
    return { nextIndex: idx, seekTo: null, reachedEnd: false };
  }
  if (idx + 1 < segments.length) {
    const next = idx + 1;
    return { nextIndex: next, seekTo: segments[next].start, reachedEnd: false };
  }
  return { nextIndex: idx, seekTo: null, reachedEnd: true };
}
