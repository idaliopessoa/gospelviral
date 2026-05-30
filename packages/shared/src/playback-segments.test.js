import { describe, it, expect } from 'vitest';
import { timestampToSeconds } from './time.js';
import {
  parseColdOpenRange,
  buildPlaybackSegments,
  advanceSegment,
} from './playback-segments.js';

describe('parseColdOpenRange (D6)', () => {
  it('parses an HH:MM:SS-HH:MM:SS range to absolute seconds (real moment #1 peak)', () => {
    // Arrange + Act — 01:28:43 = 5323, 01:29:00 = 5340
    const out = parseColdOpenRange('01:28:43-01:29:00');

    // Assert
    expect(out).toEqual({ start: 5323, end: 5340 });
  });

  it('parses an MM:SS-MM:SS range (example-fixture form)', () => {
    // Act
    const out = parseColdOpenRange('01:08-01:25');

    // Assert — 68, 85
    expect(out).toEqual({ start: 68, end: 85 });
  });

  it('returns null for missing / non-string / no-dash / blank halves', () => {
    expect(parseColdOpenRange(undefined)).toBeNull();
    expect(parseColdOpenRange('')).toBeNull();
    expect(parseColdOpenRange('01:28:43')).toBeNull(); // no dash
    expect(parseColdOpenRange('-01:29:00')).toBeNull(); // blank start
    expect(parseColdOpenRange('01:28:43-')).toBeNull(); // blank end
  });

  it('returns null for an inverted or zero-length range', () => {
    expect(parseColdOpenRange('01:29:00-01:28:43')).toBeNull(); // end < start
    expect(parseColdOpenRange('01:28:43-01:28:43')).toBeNull(); // end === start
  });

  it('returns null when a half is unparseable (timestampToSeconds → 0 guard)', () => {
    expect(parseColdOpenRange('foo-bar')).toBeNull();
  });

  it('REGRESSION: timestampToSeconds on the WHOLE range string returns 0 (why we split first)', () => {
    // This documents the trap parseColdOpenRange exists to avoid: the substring
    // "43-01" is NaN → the lenient parser guards to 0 → cold open would jump to
    // the file start. parseColdOpenRange must split on '-' BEFORE parsing.
    expect(timestampToSeconds('01:28:43-01:29:00')).toBe(0);
  });
});

describe('buildPlaybackSegments (D6)', () => {
  const COLD_OPEN_MOMENT = {
    timestamp_start: '01:28:25',
    timestamp_end: '01:29:13',
    cold_open_analysis: { decision: 'apply_cold_open' },
  };

  it('apply_cold_open + valid range → [peak, fullCut] (peak first, cut replays it)', () => {
    // Arrange — real #1: cut 5305-5353, peak 5323-5340
    const range = { start: 5323, end: 5340 };

    // Act
    const segments = buildPlaybackSegments(COLD_OPEN_MOMENT, range);

    // Assert
    expect(segments).toEqual([
      { start: 5323, end: 5340 },
      { start: 5305, end: 5353 },
    ]);
  });

  it('keep_linear → [fullCut] (single segment = pre-D6 path)', () => {
    // Arrange
    const moment = { ...COLD_OPEN_MOMENT, cold_open_analysis: { decision: 'keep_linear' } };

    // Act
    const segments = buildPlaybackSegments(moment, { start: 5323, end: 5340 });

    // Assert
    expect(segments).toEqual([{ start: 5305, end: 5353 }]);
  });

  it('apply_cold_open but null range (unparseable peak) → [fullCut] (linear fallback)', () => {
    // Act
    const segments = buildPlaybackSegments(COLD_OPEN_MOMENT, null);

    // Assert
    expect(segments).toEqual([{ start: 5305, end: 5353 }]);
  });

  it('missing cold_open_analysis → [fullCut]', () => {
    // Act
    const segments = buildPlaybackSegments({ timestamp_start: '00:10', timestamp_end: '00:40' }, null);

    // Assert
    expect(segments).toEqual([{ start: 10, end: 40 }]);
  });
});

describe('advanceSegment (D6)', () => {
  const SEGMENTS = [
    { start: 5323, end: 5340 }, // peak
    { start: 5305, end: 5353 }, // full cut
  ];

  it('inside the active segment → no transition', () => {
    expect(advanceSegment(5330, SEGMENTS, 0)).toEqual({
      nextIndex: 0,
      seekTo: null,
      reachedEnd: false,
    });
  });

  it('at the end of a non-last segment → advance and seek the next start (backward seek allowed)', () => {
    // peak ends at 5340 → seek back to the cut start 5305, keep playing
    expect(advanceSegment(5340, SEGMENTS, 0)).toEqual({
      nextIndex: 1,
      seekTo: 5305,
      reachedEnd: false,
    });
  });

  it('at the end of the LAST segment → reachedEnd (caller pauses + onReachEnd once)', () => {
    expect(advanceSegment(5353, SEGMENTS, 1)).toEqual({
      nextIndex: 1,
      seekTo: null,
      reachedEnd: true,
    });
  });

  it('single-segment at end → reachedEnd (pre-D6 linear pause behavior)', () => {
    expect(advanceSegment(40, [{ start: 10, end: 40 }], 0)).toEqual({
      nextIndex: 0,
      seekTo: null,
      reachedEnd: true,
    });
  });
});
