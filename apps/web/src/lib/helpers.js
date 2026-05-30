// `timestampToSeconds` is the canonical clock parser owned by @gospelviral/shared
// (src/time.js — the cross-task TIME REFERENCE home). Re-exported here so web
// consumers (MomentCard, transcript-extract) keep their existing import path.
export { timestampToSeconds } from '@gospelviral/shared';

/**
 * @param {string} url YouTube watch/short/embed URL
 * @returns {string|null} video id or null when no pattern matches
 */
export function extractVideoId(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = p.exec(url);
    if (m) return m[1];
  }
  return null;
}

/**
 * Split a caption into screen-sized chunks for sequential display.
 *
 * @param {string} text
 * @param {number} charsPerScreen
 * @param {number} lines
 * @returns {string[]} non-empty array (returns [""] on empty input)
 */
export function chunkText(text, charsPerScreen, lines) {
  if (!text) return [''];
  const charsPerChunk = charsPerScreen * lines;
  const words = text.split(' ');
  const chunks = [];
  let current = '';
  for (const word of words) {
    const candidate = (current + ' ' + word).trim();
    if (candidate.length <= charsPerChunk) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

function clamp(n, lo, hi) {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * Pick the subtitle chunk visible at `currentTime` within a cue window (D3 —
 * panel as SSOT for on-screen text shape). The text is split with `chunkText`
 * (the SAME math the Phase 6 burned-in export uses → "o que se vê é o que se
 * queima", preview == export — never a CSS-clamp-only approximation), and the
 * chunk index is DERIVED from `currentTime` across `[start, end)` — no timer,
 * no extra state (the only clock is `currentTime`). Pin to chunk[0] by passing
 * `cueWindow.start` as `currentTime` (edit mode / paused poster).
 *
 * @param {string} text                       cue text (or key_quote fallback)
 * @param {number} currentTime                seconds, absolute on the file timeline
 * @param {{start: number, end: number}} cueWindow  the active cue's [start, end)
 * @param {{charsPerScreen: number, lines: number}} shape  panel subtitle shape
 * @returns {string} the visible chunk
 */
export function selectVisibleChunk(text, currentTime, cueWindow, { charsPerScreen, lines }) {
  const chunks = chunkText(text, charsPerScreen, lines);
  if (chunks.length <= 1) return chunks[0];
  const { start, end } = cueWindow;
  const duration = end - start;
  if (duration <= 0) return chunks[0];
  const perChunk = duration / chunks.length;
  const idx = Math.floor((currentTime - start) / perChunk);
  return chunks[clamp(idx, 0, chunks.length - 1)];
}
