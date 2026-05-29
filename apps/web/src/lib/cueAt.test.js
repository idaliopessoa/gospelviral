import { describe, it, expect } from 'vitest';
import { cueAt } from './cueAt.js';

// Gap-free tiled cues (as produced by buildSubtitleCues): end === next.start
const CUES = [
  { text: 'a', start: 10, end: 20 },
  { text: 'b', start: 20, end: 30 },
  { text: 'c', start: 30, end: 40 },
];

describe('cueAt', () => {
  it('returns null for an empty cue list', () => {
    // Arrange + Act + Assert
    expect(cueAt([], 15)).toBeNull();
  });

  it('returns null for a non-array', () => {
    // Arrange + Act + Assert
    expect(cueAt(null, 15)).toBeNull();
    expect(cueAt(undefined, 15)).toBeNull();
  });

  it('returns the first cue when t is before the first cue start (no blank flash)', () => {
    // Arrange + Act + Assert — representative cue for the pre-roll / edit gap
    expect(cueAt(CUES, 5)).toBe(CUES[0]);
  });

  it('returns the cue containing t (start inclusive)', () => {
    // Arrange + Act + Assert
    expect(cueAt(CUES, 10)).toBe(CUES[0]);
    expect(cueAt(CUES, 15)).toBe(CUES[0]);
    expect(cueAt(CUES, 35)).toBe(CUES[2]);
  });

  it('treats the boundary as half-open [start, end) — t at a boundary belongs to the next cue', () => {
    // Arrange + Act + Assert — t === a.end === b.start → b
    expect(cueAt(CUES, 20)).toBe(CUES[1]);
    expect(cueAt(CUES, 30)).toBe(CUES[2]);
  });

  it('clamps to the last cue at and beyond the segment end', () => {
    // Arrange + Act + Assert — t === last.end and t past it both hold the last cue
    expect(cueAt(CUES, 40)).toBe(CUES[2]);
    expect(cueAt(CUES, 50)).toBe(CUES[2]);
  });
});
