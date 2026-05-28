import { timestampToSeconds } from './helpers.js';

const TIMESTAMP_LINE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.*)$/;

function tsToSeconds(hh, mm, ss) {
  const h = hh ? Number(hh) : 0;
  return h * 3600 + Number(mm) * 60 + Number(ss);
}

function parseTranscriptLines(transcript) {
  if (typeof transcript !== 'string' || transcript.length === 0) return [];
  const out = [];
  for (const raw of transcript.split('\n')) {
    const match = TIMESTAMP_LINE.exec(raw);
    if (match) {
      const [, hh, mm, ss, text] = match;
      out.push({ tsSec: tsToSeconds(hh, mm, ss), text });
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
 * Slice a transcript by moment range and return the concatenated text.
 *
 * @param {string} transcript raw transcript ("MM:SS text" or "HH:MM:SS text" per line)
 * @param {string} startTs   moment.timestamp_start ("MM:SS" or "HH:MM:SS")
 * @param {string} endTs     moment.timestamp_end ("MM:SS" or "HH:MM:SS")
 * @returns {string} joined text with timecodes stripped; empty string on degenerate input
 */
export function extractSegmentText(transcript, startTs, endTs) {
  const startSec = timestampToSeconds(startTs);
  const endSec = timestampToSeconds(endTs);
  if (endSec <= startSec) return '';
  const lines = parseTranscriptLines(transcript);
  if (lines.length === 0) return '';
  const within = lines.filter((l) => l.tsSec >= startSec && l.tsSec < endSec);
  if (within.length === 0 && startSec < lines[0].tsSec) {
    within.push(...lines.filter((l) => l.tsSec < endSec));
  }
  return normalize(within.map((l) => l.text).join(' '));
}
