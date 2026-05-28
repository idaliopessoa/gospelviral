import { timestampToSeconds } from './helpers.js';

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

function parseTranscriptLines(transcript) {
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

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Slice a transcript by moment range and return the matching cues
 * as an array of normalized text lines (one entry per transcript cue,
 * with continuation text already merged into its anchor cue).
 *
 * @param {string} transcript raw transcript ("MM:SS text" or "HH:MM:SS text" per line)
 * @param {string} startTs   moment.timestamp_start ("MM:SS" or "HH:MM:SS")
 * @param {string} endTs     moment.timestamp_end ("MM:SS" or "HH:MM:SS")
 * @returns {string[]} per-cue text array; empty array on degenerate input
 */
export function extractSegmentLines(transcript, startTs, endTs) {
  const startSec = timestampToSeconds(startTs);
  const endSec = timestampToSeconds(endTs);
  if (endSec <= startSec) return [];
  const lines = parseTranscriptLines(transcript);
  if (lines.length === 0) return [];
  return lines
    .filter((l) => l.tsSec >= startSec && l.tsSec < endSec)
    .map((l) => normalize(l.text))
    .filter((t) => t.length > 0);
}

/**
 * Slice a transcript by moment range and return the concatenated text.
 *
 * @param {string} transcript raw transcript ("MM:SS text" or "HH:MM:SS text" per line)
 * @param {string} startTs   moment.timestamp_start ("MM:SS" or "HH:MM:SS")
 * @param {string} endTs     moment.timestamp_end ("MM:SS" or "HH:MM:SS")
 * @returns {string} joined text with timecodes stripped; empty string on degenerate input
 */
export function extractSegmentText(transcript, startTs, endTs) {
  return extractSegmentLines(transcript, startTs, endTs).join(' ');
}
