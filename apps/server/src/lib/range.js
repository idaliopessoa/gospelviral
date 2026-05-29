/**
 * Pure parser for a single HTTP `Range` request header (the only shape a
 * `<video>` element issues for progressive playback). Char-scanned, NO regex
 * — keeps Cognitive Complexity low and avoids the `javascript:S5852` ReDoS
 * hotspot (see project memory).
 */

const PREFIX = 'bytes=';

/**
 * Default cap for an OPEN-ENDED (`bytes=START-`) range response. A `<video>`
 * deep-seeking a large non-faststart file issues `bytes=START-`; serving it to
 * EOF streams hundreds of MB the player never uses before re-seeking. Bounding
 * the open-ended response to a chunk (the browser re-requests the next chunk as
 * it plays) keeps each 206 small. 8 MiB ≈ a few seconds of 1080p.
 */
export const DEFAULT_OPEN_RANGE_CHUNK_BYTES = 8 * 1024 * 1024;

function isDigits(s) {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function parseSuffix(bStr, size) {
  if (!isDigits(bStr)) return null;
  const n = Number(bStr);
  if (n === 0) return 'unsatisfiable';
  return { start: Math.max(0, size - n), end: size - 1 };
}

function parseFromStart(aStr, bStr, size, maxOpenEndedBytes) {
  if (!isDigits(aStr)) return null;
  const start = Number(aStr);
  let end;
  let openEnded = false;
  if (bStr === '') {
    end = size - 1;
    openEnded = true;
  } else {
    if (!isDigits(bStr)) return null;
    end = Number(bStr);
    if (start > end) return null;
  }
  if (start >= size) return 'unsatisfiable';
  if (end >= size) end = size - 1;
  // Cap ONLY an open-ended `bytes=START-` to a bounded chunk (O2). An explicit
  // `bytes=START-END` asked for a specific window — respect it untouched. When
  // the remaining tail is already smaller than the cap, serve it to EOF.
  if (openEnded && Number.isFinite(maxOpenEndedBytes)) {
    const capped = start + maxOpenEndedBytes - 1;
    if (capped < end) end = capped;
  }
  return { start, end };
}

/**
 * @param {unknown} headerValue raw `Range` header
 * @param {number} size total file size in bytes
 * @param {number} [maxOpenEndedBytes=Infinity] cap for an open-ended `bytes=START-`
 *   response (O2). `Infinity` (default) preserves the stream-to-EOF behavior.
 * @returns {{ start: number, end: number } | null | 'unsatisfiable'}
 *   `null` = absent / garbage / unsupported → caller serves the full body;
 *   `'unsatisfiable'` = valid syntax but out of bounds → caller sends 416;
 *   `{start, end}` = inclusive byte range (open-ended ranges capped per above).
 */
export function parseRangeHeader(headerValue, size, maxOpenEndedBytes = Infinity) {
  if (typeof headerValue !== 'string') return null;
  if (!headerValue.startsWith(PREFIX)) return null;
  const spec = headerValue.slice(PREFIX.length);
  if (spec.includes(',')) return null; // multi-range unsupported
  const dash = spec.indexOf('-');
  if (dash === -1) return null;
  const aStr = spec.slice(0, dash);
  const bStr = spec.slice(dash + 1);
  if (aStr === '') return parseSuffix(bStr, size);
  return parseFromStart(aStr, bStr, size, maxOpenEndedBytes);
}
