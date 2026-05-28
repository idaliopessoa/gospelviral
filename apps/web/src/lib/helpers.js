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
 * @param {string} ts "MM:SS" or "HH:MM:SS"
 * @returns {number} seconds (0 on falsy or unrecognized)
 */
export function timestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
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
