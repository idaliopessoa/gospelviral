/**
 * Pure parser for a single HTTP `Range` request header (the only shape a
 * `<video>` element issues for progressive playback). Char-scanned, NO regex
 * — keeps Cognitive Complexity low and avoids the `javascript:S5852` ReDoS
 * hotspot (see project memory).
 */

const PREFIX = 'bytes=';

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

function parseFromStart(aStr, bStr, size) {
  if (!isDigits(aStr)) return null;
  const start = Number(aStr);
  let end;
  if (bStr === '') {
    end = size - 1;
  } else {
    if (!isDigits(bStr)) return null;
    end = Number(bStr);
    if (start > end) return null;
  }
  if (start >= size) return 'unsatisfiable';
  if (end >= size) end = size - 1;
  return { start, end };
}

/**
 * @param {unknown} headerValue raw `Range` header
 * @param {number} size total file size in bytes
 * @returns {{ start: number, end: number } | null | 'unsatisfiable'}
 *   `null` = absent / garbage / unsupported → caller serves the full body;
 *   `'unsatisfiable'` = valid syntax but out of bounds → caller sends 416;
 *   `{start, end}` = inclusive byte range.
 */
export function parseRangeHeader(headerValue, size) {
  if (typeof headerValue !== 'string') return null;
  if (!headerValue.startsWith(PREFIX)) return null;
  const spec = headerValue.slice(PREFIX.length);
  if (spec.includes(',')) return null; // multi-range unsupported
  const dash = spec.indexOf('-');
  if (dash === -1) return null;
  const aStr = spec.slice(0, dash);
  const bStr = spec.slice(dash + 1);
  if (aStr === '') return parseSuffix(bStr, size);
  return parseFromStart(aStr, bStr, size);
}
