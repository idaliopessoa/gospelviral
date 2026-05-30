import { parseTranscriptLines, normalizeCueText } from '@gospelviral/shared';
import { timestampToSeconds } from './helpers.js';

// Transcript line-parsing + normalization live in @gospelviral/shared
// (transcript-lines.js) — the single parser shared with the Phase 5/6 subtitle
// cues. This module keeps only the web-only segment-slicing surface that
// MomentCard consumes; its public behavior is unchanged (TASK_017 / DEC D2).

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
    .map((l) => normalizeCueText(l.text))
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
