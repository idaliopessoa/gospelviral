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

/**
 * Parse a 4-field `HH:MM:SS:FF` timecode (video-editor export, 30 fps) into
 * whole START seconds. Frames (the 4th field) are DROPPED, never converted to
 * fractional seconds: that would require knowing the fps and would break the
 * whole-second absolute TIME REFERENCE. Returns null if not a 4-field timecode.
 */
function parseTimecodeSeconds(tc) {
  const parts = tc.split(':');
  if (parts.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    if (!isDigits(parts[i], 1, 2)) return null;
  }
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
}

/**
 * New format (D4): a whole line `HH:MM:SS:FF - HH:MM:SS:FF` from a video-editor
 * export. Anchors on the range START (frames dropped); the spoken text arrives
 * on the FOLLOWING lines, so the anchor's own text is empty. `editorAnchor`
 * flags the caller to skip the speaker-label line that follows. No existing
 * `MM:SS text` line can match (none carries a ` - <timecode>` second field), so
 * the frozen clock behavior is untouched by construction.
 */
function parseEditorRangeAnchor(raw) {
  const sep = raw.indexOf(' - ');
  if (sep === -1) return null;
  const start = parseTimecodeSeconds(raw.slice(0, sep));
  if (start === null) return null;
  if (parseTimecodeSeconds(raw.slice(sep + 3)) === null) return null;
  return { tsSec: start, text: '', editorAnchor: true };
}

/**
 * Frozen strict clock anchor: `MM:SS text` / `HH:MM:SS text` (1–2 digit
 * hours/minutes, exactly-2 digit seconds). Behavior is byte-identical to the
 * pre-D4 parser — it must REJECT a malformed prefix so the line falls through
 * to continuation handling.
 */
function parseClockAnchor(raw) {
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
 * Line-level format dispatcher: the editor-export range anchor first (its
 * mandatory ` - <4-field timecode>` is unambiguous), then the frozen clock
 * anchor. Returns null for any non-anchor line (continuation / blank).
 */
function parseTimestampPrefix(raw) {
  return parseEditorRangeAnchor(raw) ?? parseClockAnchor(raw);
}

/**
 * Parse a raw transcript into timed lines. One entry per timestamped line;
 * a line with no leading timestamp is merged (appended) into the previous
 * line's text. A continuation line before any anchor is discarded.
 *
 * Two line formats are recognized (auto-detected per line, no global mode):
 *   - `MM:SS text` / `HH:MM:SS text`            (frozen — text on the same line)
 *   - `HH:MM:SS:FF - HH:MM:SS:FF` editor export (D4 — speaker label + text on
 *     the FOLLOWING lines; frames dropped; the speaker line is skipped by
 *     position so it never pollutes the cue text)
 *
 * @param {string} transcript raw transcript (either/both formats, per line)
 * @returns {{tsSec: number, text: string}[]} timed lines, `tsSec` absolute seconds; [] on degenerate input
 */
export function parseTranscriptLines(transcript) {
  if (typeof transcript !== 'string' || transcript.length === 0) return [];
  const out = [];
  let skipSpeakerLine = false;
  for (const raw of transcript.split('\n')) {
    const parsed = parseTimestampPrefix(raw);
    if (parsed) {
      out.push({ tsSec: parsed.tsSec, text: parsed.text });
      skipSpeakerLine = parsed.editorAnchor === true;
      continue;
    }
    if (out.length === 0) continue;
    const trimmed = raw.trim();
    if (trimmed === '') continue;
    if (skipSpeakerLine) {
      skipSpeakerLine = false; // drop the speaker-label line after an editor anchor
      continue;
    }
    const last = out[out.length - 1];
    last.text = last.text ? `${last.text} ${trimmed}` : trimmed;
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
