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
