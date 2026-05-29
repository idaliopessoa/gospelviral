import { describe, it, expect } from 'vitest';
import { timestampToSeconds } from './time.js';

describe('timestampToSeconds', () => {
  it('parses MM:SS', () => {
    // Arrange + Act + Assert
    expect(timestampToSeconds('02:30')).toBe(150);
  });

  it('parses HH:MM:SS', () => {
    // Arrange + Act + Assert
    expect(timestampToSeconds('01:02:03')).toBe(3723);
  });

  it('returns 0 for falsy input', () => {
    // Arrange + Act + Assert
    expect(timestampToSeconds('')).toBe(0);
    expect(timestampToSeconds(null)).toBe(0);
    expect(timestampToSeconds(undefined)).toBe(0);
  });

  it('returns 0 for unparseable string', () => {
    // Arrange + Act + Assert
    expect(timestampToSeconds('not-a-timestamp')).toBe(0);
  });

  it('returns 0 for a numeric string with no colon (neither MM:SS nor HH:MM:SS)', () => {
    // Arrange + Act + Assert — single part, parses as a number but is not a clock
    expect(timestampToSeconds('90')).toBe(0);
  });

  it('keeps the absolute file-timeline scale (47:30 → 2850, never relative)', () => {
    // Arrange + Act + Assert — anchors the cross-task TIME REFERENCE invariant
    expect(timestampToSeconds('47:30')).toBe(2850);
  });
});
