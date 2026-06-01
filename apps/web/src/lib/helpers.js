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

// Font size as a fraction of the canvas width, per `size` (TASK_022). Canvas-
// relative so the 280-px preview and the 1080-px export share one proportion
// (preview == export). Tuned to the prior preview px (≈14/17/21 at a 340-px
// canvas). The font depends ONLY on `size` — never on charsPerScreen.
const SUBTITLE_SIZE_FRACTION = { S: 0.042, M: 0.05, L: 0.062 };
// Fallback glyph advance (fraction of font-size) when the real font can't be
// measured (jsdom). ~0.5 ≈ a typical proportional sans.
const FALLBACK_CHAR_ADVANCE_EM = 0.5;
/** The subtitle line wraps at this fraction of the canvas width (px). */
export const SUBTITLE_LINE_MAX_FRACTION = 0.94;

const _advanceCache = new Map();

/**
 * Average glyph advance of `fontFamily` as a fraction of font-size, measured
 * with a Canvas 2D context (TASK_022). Memoized per font. Returns the fallback
 * when canvas/text metrics are unavailable (jsdom / SSR), so the derivation
 * still works in tests.
 *
 * @param {string} fontFamily
 * @returns {number} advance per em (e.g. Bebas ≈ 0.35, Archivo Black ≈ 0.58)
 */
export function measureCharAdvanceEm(fontFamily) {
  if (_advanceCache.has(fontFamily)) return _advanceCache.get(fontFamily);
  let advance = FALLBACK_CHAR_ADVANCE_EM;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx && typeof ctx.measureText === 'function') {
      const sample = 'Você colocou essa aliança no dedo da sua esposa querida';
      ctx.font = `700 100px '${fontFamily}', sans-serif`;
      const w = ctx.measureText(sample).width;
      if (w > 0) advance = w / 100 / sample.length;
    }
  } catch {
    advance = FALLBACK_CHAR_ADVANCE_EM;
  }
  _advanceCache.set(fontFamily, advance);
  return advance;
}

/**
 * Derive the subtitle font size (px) from ONLY `size` + the measured canvas
 * width (TASK_022 — SSOT for subtitle size). Independent of charsPerScreen, so
 * the chars/tela slider never changes the font size. Scales with the canvas so
 * the 280-px preview and the 1080-px export share one proportion (preview ==
 * export).
 *
 * @param {number} canvasWidthPx measured preview/canvas width in px
 * @param {'S'|'M'|'L'} size
 * @returns {number} font size in px (rounded to 0.1)
 */
export function deriveSubtitleFontPx(canvasWidthPx, size) {
  const frac = SUBTITLE_SIZE_FRACTION[size] ?? SUBTITLE_SIZE_FRACTION.M;
  return Math.round(canvasWidthPx * frac * 10) / 10;
}

/**
 * Effective characters per line: the panel's desired `charsPerScreen`, capped
 * by how many of the actual font fit one wrap-width line at the (size-driven)
 * font size (TASK_022). This is what `chars/tela` controls — the line WIDTH —
 * while keeping `lines` a true visual cap (a `perLine×lines` chunk wraps to at
 * most `lines` rows). Never raises the font; only narrows/limits the line.
 *
 * @param {number} charsPerScreen panel slider (desired chars per line)
 * @param {number} canvasWidthPx measured canvas width in px
 * @param {number} fontPx the size-driven font size (from deriveSubtitleFontPx)
 * @param {number} [advanceEm] font advance per em (defaults to the fallback)
 * @returns {number} effective chars per line (≥ 1)
 */
export function subtitleCharsPerLine(charsPerScreen, canvasWidthPx, fontPx, advanceEm = FALLBACK_CHAR_ADVANCE_EM) {
  const adv = advanceEm > 0 ? advanceEm : FALLBACK_CHAR_ADVANCE_EM;
  const wrapPx = canvasWidthPx * SUBTITLE_LINE_MAX_FRACTION;
  const fit = Math.max(1, Math.floor(wrapPx / (adv * fontPx)));
  const desired = charsPerScreen > 0 ? charsPerScreen : 1;
  return Math.min(desired, fit);
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
