import { timestampToSeconds } from './time.js';
import { parseTranscriptLines, normalizeCueText } from './transcript-lines.js';

/**
 * Build the subtitle cues for a moment's time range from the transcript.
 *
 * One cue per transcript line that falls within `[startSec, endSec)`
 * (end exclusive, matching `extractSegmentLines`). Granularity mirrors the
 * source — phrase-timed transcripts yield phrase cues, word-timed transcripts
 * yield word cues. The builder imposes no re-chunking (the opposite of the old
 * 2.2s `chunkText` rotation).
 *
 * Lines whose text normalizes to empty are dropped FIRST, then the surviving
 * (visible) cues are tiled: `cue.start` = the line's own timestamp, `cue.end`
 * = the NEXT VISIBLE cue's start, and the last cue ends at the segment
 * `endSec`. This keeps coverage gap-free across what the viewer actually sees,
 * skipping discarded blank lines rather than leaving a hole.
 *
 * ⏱ TIME REFERENCE (cross-task invariant 016/017/018): `start`/`end` are
 * seconds ABSOLUTE on the full uploaded video file's timeline — the SAME scale
 * as the transcript timestamps and `<video>.currentTime`. A 47:30 line →
 * `start = 2850`. `startSec` is NEVER subtracted; the Phase 5 player compares
 * `currentTime` against these values with no offset math.
 *
 * Pure / deterministic — no DOM, no Date, no randomness.
 *
 * @param {string} transcript raw transcript ("MM:SS text" / "HH:MM:SS text" per line)
 * @param {string} startTs    moment.timestamp_start ("MM:SS" or "HH:MM:SS")
 * @param {string} endTs      moment.timestamp_end ("MM:SS" or "HH:MM:SS")
 * @returns {import('./types.js').SubtitleCue[]} cues; empty array on degenerate input
 */
export function buildSubtitleCues(transcript, startTs, endTs) {
  const startSec = timestampToSeconds(startTs);
  const endSec = timestampToSeconds(endTs);
  if (endSec <= startSec) return [];

  const visible = parseTranscriptLines(transcript)
    .filter((line) => line.tsSec >= startSec && line.tsSec < endSec)
    .map((line) => ({ tsSec: line.tsSec, text: normalizeCueText(line.text) }))
    .filter((cue) => cue.text.length > 0);

  return visible.map((cue, i) => ({
    text: cue.text,
    start: cue.tsSec,
    end: i + 1 < visible.length ? visible[i + 1].tsSec : endSec,
  }));
}
