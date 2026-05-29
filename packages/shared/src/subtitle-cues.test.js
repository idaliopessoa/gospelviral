import { describe, it, expect } from 'vitest';
import { buildSubtitleCues } from './subtitle-cues.js';
import { EXAMPLE_TRANSCRIPT } from './example-data.js';

describe('buildSubtitleCues', () => {
  it('tiles the EXAMPLE_TRANSCRIPT segment gap-free with timecodes stripped (success criterion #1)', () => {
    // Arrange — moment range 01:08 .. 02:15 (68s .. 135s absolute)

    // Act
    const cues = buildSubtitleCues(EXAMPLE_TRANSCRIPT, '01:08', '02:15');

    // Assert — four in-range lines (68, 85, 102, 118), tiled to the segment end
    expect(cues.map((c) => c.start)).toEqual([68, 85, 102, 118]);
    expect(cues.map((c) => c.end)).toEqual([85, 102, 118, 135]);
    for (const cue of cues) {
      expect(cue.text.length).toBeGreaterThan(0);
      expect(cue.text).not.toMatch(/^\d{1,2}:\d{2}/); // no leading timecode
    }
  });

  it('cue.start is ABSOLUTE on the file timeline — a 47:30 line yields 2850, never relative to the cut', () => {
    // Arrange — cut opens at 47:00; the pinned line sits at 47:30
    const transcript = ['47:00 cut opens', '47:30 the pinned line', '48:00 cut tail'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '47:00', '48:00');

    // Assert — 47:30 = 2850s absolute, NOT 30s relative to the 47:00 cut, NOT 0
    const pinned = cues.find((c) => c.text === 'the pinned line');
    expect(pinned.start).toBe(2850);
    expect(pinned.start).not.toBe(30);
    expect(pinned.start).not.toBe(0);
  });

  it("each cue's end is the next cue's start; the last cue ends at the segment endSec", () => {
    // Arrange
    const transcript = ['00:00 a', '00:30 b', '01:00 c', '01:30 d'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '00:30', '01:30');

    // Assert — in-range = 30s (b), 60s (c); last end clamps to endSec (90)
    expect(cues).toEqual([
      { text: 'b', start: 30, end: 60 },
      { text: 'c', start: 60, end: 90 },
    ]);
  });

  it('mirrors word-level granularity — one cue per close-timed line, no re-chunking', () => {
    // Arrange — word-timed source: a cue every second
    const transcript = ['00:01 um', '00:02 dois', '00:03 tres', '00:04 quatro'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '00:00', '00:05');

    // Assert — four cues, one per word, tiled to endSec (5)
    expect(cues).toEqual([
      { text: 'um', start: 1, end: 2 },
      { text: 'dois', start: 2, end: 3 },
      { text: 'tres', start: 3, end: 4 },
      { text: 'quatro', start: 4, end: 5 },
    ]);
  });

  it('mirrors phrase-level granularity — one cue per phrase line', () => {
    // Arrange
    const transcript = ['00:00 primeira frase inteira', '00:20 segunda frase inteira'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '00:00', '00:40');

    // Assert
    expect(cues).toEqual([
      { text: 'primeira frase inteira', start: 0, end: 20 },
      { text: 'segunda frase inteira', start: 20, end: 40 },
    ]);
  });

  it('merges continuation lines into the anchor cue text (single cue)', () => {
    // Arrange
    const transcript = [
      '00:00 anchor zero',
      '01:00 anchor sixty',
      'continuation of anchor sixty',
      'second continuation',
      '02:00 anchor one twenty',
    ].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '01:00', '02:00');

    // Assert
    expect(cues).toEqual([
      {
        text: 'anchor sixty continuation of anchor sixty second continuation',
        start: 60,
        end: 120,
      },
    ]);
  });

  it('drops an empty-text cue and keeps tiling gap-free across VISIBLE cues only', () => {
    // Arrange — the middle line normalizes to empty (whitespace-only after its timecode)
    const transcript = ['00:00 first', '00:30    ', '01:00 third'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '00:00', '01:30');

    // Assert
    // (a) no phantom empty-text cue
    expect(cues).toHaveLength(2);
    expect(cues.every((c) => c.text.length > 0)).toBe(true);
    // (b) the first cue extends to the next VISIBLE cue (60s), NOT the discarded 30s line
    expect(cues).toEqual([
      { text: 'first', start: 0, end: 60 },
      { text: 'third', start: 60, end: 90 },
    ]);
  });

  it('excludes a line sitting exactly on endSec (end is exclusive)', () => {
    // Arrange
    const transcript = ['00:30 inside', '01:00 boundary'].join('\n');

    // Act
    const cues = buildSubtitleCues(transcript, '00:30', '01:00');

    // Assert — the 01:00 line is at endSec and is excluded
    expect(cues).toEqual([{ text: 'inside', start: 30, end: 60 }]);
  });

  it('returns [] when start === end (zero-length segment)', () => {
    // Arrange + Act + Assert
    expect(buildSubtitleCues('00:30 line', '00:30', '00:30')).toEqual([]);
  });

  it('returns [] for a reversed range', () => {
    // Arrange + Act + Assert
    expect(buildSubtitleCues('00:00 a\n01:00 b', '02:00', '01:00')).toEqual([]);
  });

  it('returns [] for empty / no-timestamp / non-string transcript', () => {
    // Arrange + Act + Assert
    expect(buildSubtitleCues('', '00:00', '01:00')).toEqual([]);
    expect(buildSubtitleCues('no timestamps here', '00:00', '01:00')).toEqual([]);
    expect(buildSubtitleCues(null, '00:00', '01:00')).toEqual([]);
  });
});
