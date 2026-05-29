import { describe, it, expect } from 'vitest';
import { parseTranscriptLines, normalizeCueText } from './transcript-lines.js';

describe('parseTranscriptLines', () => {
  it('parses MM:SS lines into { tsSec, text } with absolute seconds', () => {
    // Arrange
    const transcript = ['00:00 line zero', '00:30 line thirty'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 0, text: 'line zero' },
      { tsSec: 30, text: 'line thirty' },
    ]);
  });

  it('parses HH:MM:SS lines (hour-scale absolute seconds)', () => {
    // Arrange
    const transcript = ['01:00:00 one hour mark', '01:00:30 thirty after'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 3600, text: 'one hour mark' },
      { tsSec: 3630, text: 'thirty after' },
    ]);
  });

  it('merges a continuation line into its anchor cue text', () => {
    // Arrange
    const transcript = ['01:00 anchor', 'continuation', 'second continuation'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 60, text: 'anchor continuation second continuation' },
    ]);
  });

  it('discards a continuation line that appears before any anchor', () => {
    // Arrange
    const transcript = ['orphan with no anchor', '00:30 anchored'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([{ tsSec: 30, text: 'anchored' }]);
  });

  it('rejects a malformed timestamp prefix (single-digit seconds) as a non-anchor', () => {
    // Arrange — "00:5" has 1-digit seconds; the strict prefix parser refuses it
    const transcript = ['00:5 not a real timestamp', '00:30 real'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — the malformed line is dropped (no anchor yet), only the valid one survives
    expect(out).toEqual([{ tsSec: 30, text: 'real' }]);
  });

  it('rejects a prefix whose minute/hour part holds a non-digit char as a non-anchor', () => {
    // Arrange — "0a" is 2 chars but not all digits; the strict parser refuses it
    const transcript = ['0a:30 garbled prefix', '00:30 real'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — only the well-formed line becomes an anchor
    expect(out).toEqual([{ tsSec: 30, text: 'real' }]);
  });

  it('returns [] for empty string', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines('')).toEqual([]);
  });

  it('returns [] for non-string input', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines(null)).toEqual([]);
    expect(parseTranscriptLines(undefined)).toEqual([]);
    expect(parseTranscriptLines(42)).toEqual([]);
  });

  it('returns [] when no line carries a timestamp', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines('just text\nmore text')).toEqual([]);
  });
});

describe('normalizeCueText', () => {
  it('collapses internal whitespace to a single space', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('spaced   text   here')).toBe('spaced text here');
  });

  it('trims leading and trailing whitespace', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('  padded  ')).toBe('padded');
  });

  it('normalizes a whitespace-only string to empty', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('     ')).toBe('');
  });
});
