/**
 * Transcript line parsing — the single source of truth for turning a raw
 * transcript into timed lines. Consolidated here (TASK_017, honoring the
 * TASK_013 promotion clause) so the Phase 5/6 subtitle cues and the web
 * `transcript-extract` helpers share ONE parser instead of duplicating it.
 *
 * Char-scan only — no regex on the parsing path. Pure / deterministic.
 *
 * NOTE: `parseTimestampPrefix` keeps its own strict inline seconds arithmetic
 * (1–2 digit hours/minutes, exactly-2 digit seconds) on purpose. It is NOT
 * routed through `timestampToSeconds` from `./time.js`: that one is lenient
 * (returns 0 on garbage) while this one must REJECT a malformed line prefix so
 * it falls through to continuation-line handling. Different validation
 * contracts → kept separate (SSOT with discernment, not DRY-maxing).
 */

function isDigits(s, min, max) {
  if (s.length < min || s.length > max) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function parseTimestampPrefix(raw) {
  const space = raw.indexOf(' ');
  if (space <= 0) return null;
  const head = raw.slice(0, space);
  const parts = head.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isDigits(parts[i], 1, 2)) return null;
  }
  if (!isDigits(parts[parts.length - 1], 2, 2)) return null;
  const tsSec =
    parts.length === 3
      ? Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
      : Number(parts[0]) * 60 + Number(parts[1]);
  let textStart = space + 1;
  while (textStart < raw.length && raw.charCodeAt(textStart) === 32) textStart++;
  return { tsSec, text: raw.slice(textStart) };
}

/**
 * Parse a raw transcript into timed lines. One entry per timestamped line;
 * a line with no leading timestamp is merged (appended) into the previous
 * line's text. A continuation line before any anchor is discarded.
 *
 * @param {string} transcript raw transcript ("MM:SS text" or "HH:MM:SS text" per line)
 * @returns {{tsSec: number, text: string}[]} timed lines, `tsSec` absolute seconds; [] on degenerate input
 */
export function parseTranscriptLines(transcript) {
  if (typeof transcript !== 'string' || transcript.length === 0) return [];
  const out = [];
  for (const raw of transcript.split('\n')) {
    const parsed = parseTimestampPrefix(raw);
    if (parsed) {
      out.push(parsed);
      continue;
    }
    if (out.length === 0) continue;
    const trimmed = raw.trim();
    if (trimmed) out[out.length - 1].text += ` ${trimmed}`;
  }
  return out;
}

/**
 * Collapse internal whitespace to single spaces and trim. Shared by the cue
 * builder and the web segment extractors so cue text is normalized identically.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeCueText(text) {
  return text.replace(/\s+/g, ' ').trim();
}
