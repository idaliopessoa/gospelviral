import { describe, it, expect } from 'vitest';
import { parseRangeHeader } from './range.js';

const SIZE = 1000; // bytes 0..999

describe('parseRangeHeader', () => {
  it('parses a closed range bytes=0-99 (inclusive)', () => {
    // Arrange + Act
    const out = parseRangeHeader('bytes=0-99', SIZE);

    // Assert
    expect(out).toEqual({ start: 0, end: 99 });
  });

  it('parses an open-ended range bytes=100- to the last byte', () => {
    // Arrange + Act
    const out = parseRangeHeader('bytes=100-', SIZE);

    // Assert
    expect(out).toEqual({ start: 100, end: 999 });
  });

  it('parses bytes=0- to the whole file', () => {
    // Arrange + Act
    const out = parseRangeHeader('bytes=0-', SIZE);

    // Assert
    expect(out).toEqual({ start: 0, end: 999 });
  });

  it('parses a suffix range bytes=-100 as the last 100 bytes', () => {
    // Arrange + Act
    const out = parseRangeHeader('bytes=-100', SIZE);

    // Assert
    expect(out).toEqual({ start: 900, end: 999 });
  });

  it('clamps the end when it exceeds the size', () => {
    // Arrange + Act
    const out = parseRangeHeader('bytes=500-99999', SIZE);

    // Assert
    expect(out).toEqual({ start: 500, end: 999 });
  });

  it('returns "unsatisfiable" when start is at or beyond the size', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader('bytes=1000-', SIZE)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=5000-6000', SIZE)).toBe('unsatisfiable');
  });

  it('a suffix larger than the file clamps to the whole file (RFC 7233)', () => {
    // Arrange + Act — bytes=-2000 on a 1000-byte file → the whole file
    const out = parseRangeHeader('bytes=-2000', SIZE);

    // Assert
    expect(out).toEqual({ start: 0, end: 999 });
  });

  it('returns null for an absent or non-string header', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader(undefined, SIZE)).toBeNull();
    expect(parseRangeHeader(null, SIZE)).toBeNull();
    expect(parseRangeHeader(42, SIZE)).toBeNull();
  });

  it('returns null for garbage / wrong unit / non-digit bounds', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader('bytes=abc', SIZE)).toBeNull();
    expect(parseRangeHeader('items=0-99', SIZE)).toBeNull();
    expect(parseRangeHeader('bytes=', SIZE)).toBeNull();
    expect(parseRangeHeader('0-99', SIZE)).toBeNull();
    expect(parseRangeHeader('bytes=1x-9', SIZE)).toBeNull();
  });

  it('returns null when start > end', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader('bytes=50-10', SIZE)).toBeNull();
  });

  it('returns null for a multi-range request (unsupported)', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader('bytes=0-1,2-3', SIZE)).toBeNull();
  });

  it('returns null for a bare dash with no bounds', () => {
    // Arrange + Act + Assert
    expect(parseRangeHeader('bytes=-', SIZE)).toBeNull();
  });
});
