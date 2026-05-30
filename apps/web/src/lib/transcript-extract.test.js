import { describe, it, expect } from 'vitest';
import { extractSegmentLines, extractSegmentText } from './transcript-extract.js';

describe('extractSegmentText', () => {
  it('happy path: MM:SS lines, range fully inside the transcript returns concatenated text without timecodes', () => {
    // Arrange
    const transcript = [
      '00:00 line zero',
      '00:30 line thirty',
      '01:00 line sixty',
      '01:30 line ninety',
    ].join('\n');

    // Act
    const out = extractSegmentText(transcript, '00:30', '01:30');

    // Assert
    expect(out).toBe('line thirty line sixty');
  });

  it('mixed HH:MM:SS and MM:SS lines: both formats parse correctly', () => {
    // Arrange
    const transcript = [
      '00:00 intro',
      '01:00:00 one hour mark',
      '01:00:30 thirty after',
    ].join('\n');

    // Act
    const out = extractSegmentText(transcript, '01:00:00', '01:01:00');

    // Assert
    expect(out).toBe('one hour mark thirty after');
  });

  it('start before the first timestamp returns from the first line', () => {
    // Arrange
    const transcript = ['00:30 first', '01:00 second'].join('\n');

    // Act
    const out = extractSegmentText(transcript, '00:00', '01:00');

    // Assert
    expect(out).toBe('first');
  });

  it('end after the last timestamp returns through the last line', () => {
    // Arrange
    const transcript = ['00:30 first', '01:00 second', '01:30 third'].join('\n');

    // Act
    const out = extractSegmentText(transcript, '01:00', '99:99');

    // Assert
    expect(out).toBe('second third');
  });

  it('start === end returns empty string', () => {
    // Arrange
    const transcript = ['00:30 line'].join('\n');

    // Act
    const out = extractSegmentText(transcript, '00:30', '00:30');

    // Assert
    expect(out).toBe('');
  });

  it('end before start returns empty string (no throw)', () => {
    // Arrange
    const transcript = ['00:30 line'].join('\n');

    // Act
    const out = extractSegmentText(transcript, '01:00', '00:30');

    // Assert
    expect(out).toBe('');
  });

  it('empty transcript returns empty string', () => {
    // Arrange + Act
    const out = extractSegmentText('', '00:00', '01:00');

    // Assert
    expect(out).toBe('');
  });

  it('transcript with no timestamps at all returns empty string (graceful)', () => {
    // Arrange
    const transcript = 'just some text without timing\nmore lines no time';

    // Act
    const out = extractSegmentText(transcript, '00:00', '99:99');

    // Assert
    expect(out).toBe('');
  });

  it('lines without a leading timestamp attach to the previous timestamped line and are included/excluded with it', () => {
    // Arrange
    const transcript = [
      '00:00 anchor zero',
      'continuation of anchor zero',
      '01:00 anchor sixty',
      'continuation of anchor sixty',
      '02:00 anchor one twenty',
    ].join('\n');

    // Act
    const out = extractSegmentText(transcript, '01:00', '02:00');

    // Assert
    expect(out).toBe('anchor sixty continuation of anchor sixty');
  });

  it('internal whitespace normalization: multiple spaces collapse to one, leading/trailing trimmed', () => {
    // Arrange
    const transcript = [
      '00:00    spaced   text   here',
      '00:30  another   line  ',
    ].join('\n');

    // Act
    const out = extractSegmentText(transcript, '00:00', '01:00');

    // Assert
    expect(out).toBe('spaced text here another line');
  });

  it('continuation line before any timestamped line is discarded (no anchor)', () => {
    // Arrange
    const transcript = [
      'orphan continuation with no anchor',
      '00:30 anchored',
    ].join('\n');

    // Act
    const out = extractSegmentText(transcript, '00:00', '01:00');

    // Assert
    expect(out).toBe('anchored');
  });

  it('non-string inputs return empty string', () => {
    // Arrange + Act
    const a = extractSegmentText(null, '00:00', '01:00');
    const b = extractSegmentText(undefined, '00:00', '01:00');
    const c = extractSegmentText(42, '00:00', '01:00');

    // Assert
    expect(a).toBe('');
    expect(b).toBe('');
    expect(c).toBe('');
  });
});

describe('extractSegmentLines', () => {
  it('returns one entry per matched transcript cue (no joining across cues)', () => {
    // Arrange
    const transcript = [
      '00:00 line zero',
      '00:30 line thirty',
      '01:00 line sixty',
      '01:30 line ninety',
    ].join('\n');

    // Act
    const out = extractSegmentLines(transcript, '00:30', '01:30');

    // Assert
    expect(out).toEqual(['line thirty', 'line sixty']);
  });

  it('continuation lines stay merged into the anchor cue (single array entry)', () => {
    // Arrange
    const transcript = [
      '00:00 anchor zero',
      '01:00 anchor sixty',
      'continuation of anchor sixty',
      'second continuation',
      '02:00 anchor one twenty',
    ].join('\n');

    // Act
    const out = extractSegmentLines(transcript, '01:00', '02:00');

    // Assert
    expect(out).toEqual([
      'anchor sixty continuation of anchor sixty second continuation',
    ]);
  });

  it('degenerate inputs return empty array (not empty string)', () => {
    // Arrange + Act
    const reversed = extractSegmentLines('00:00 a\n01:00 b', '02:00', '01:00');
    const empty = extractSegmentLines('', '00:00', '01:00');
    const noTs = extractSegmentLines('no timestamps at all', '00:00', '01:00');

    // Assert
    expect(reversed).toEqual([]);
    expect(empty).toEqual([]);
    expect(noTs).toEqual([]);
  });

  it('per-line whitespace normalization is preserved (no leading/trailing/double spaces)', () => {
    // Arrange
    const transcript = ['00:00    spaced   text   here', '00:30   another  '].join(
      '\n',
    );

    // Act
    const out = extractSegmentLines(transcript, '00:00', '01:00');

    // Assert
    expect(out).toEqual(['spaced text here', 'another']);
  });

  it('real editor-timecode export yields clean lines — clears "Transcript indisponível" (D4)', () => {
    // Arrange — two real blocks from the smoke sermon (moment #1 range 01:28:25–01:29:13)
    const transcript = [
      '01:28:25:10 - 01:28:59:13\nUnknown\nVocê colocou essa aliança no dedo da sua esposa.',
      '01:28:59:15 - 01:29:31:09\nUnknown\nPrecisamos ser fiéis nas crises.',
    ].join('\n\n');

    // Act
    const out = extractSegmentLines(transcript, '01:28:25', '01:29:13');

    // Assert — the bug returned [] (→ "indisponível"); now clean cues, speaker stripped, no frames
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].startsWith('Unknown')).toBe(false);
    expect(out.join(' ')).not.toMatch(/\d{2}:\d{2}:\d{2}:\d{2}/);
    expect(out[0]).toContain('Você colocou essa aliança');
  });
});
