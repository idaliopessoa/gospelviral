import { describe, it, expect } from 'vitest';
import {
  CANVAS_REFERENCE,
  SUBTITLE_ANCHOR_PERCENT,
  ANALYSIS_RESPONSE_REQUIRED_KEYS,
  TOP_MOMENTS_COUNT,
  VIDEO_MIME_ALLOWLIST_DEFAULT,
} from './types.js';

describe('shared constants', () => {
  it('CANVAS_REFERENCE pins Reels/Shorts at 1080x1920 and is immutable', () => {
    // Arrange + Act + Assert
    expect(CANVAS_REFERENCE).toEqual({ width: 1080, height: 1920 });
    expect(Object.isFrozen(CANVAS_REFERENCE)).toBe(true);
  });

  it('SUBTITLE_ANCHOR_PERCENT exposes the three artifact anchors', () => {
    // Arrange + Act + Assert
    expect(SUBTITLE_ANCHOR_PERCENT).toEqual({ top: 12, center: 50, bottom: 86 });
    expect(Object.isFrozen(SUBTITLE_ANCHOR_PERCENT)).toBe(true);
  });

  it('ANALYSIS_RESPONSE_REQUIRED_KEYS lists the three envelope keys', () => {
    // Arrange + Act + Assert
    expect(ANALYSIS_RESPONSE_REQUIRED_KEYS).toEqual([
      'metadata',
      'analysis_summary',
      'top_moments',
    ]);
    expect(Object.isFrozen(ANALYSIS_RESPONSE_REQUIRED_KEYS)).toBe(true);
  });

  it('TOP_MOMENTS_COUNT is 5', () => {
    // Arrange + Act + Assert
    expect(TOP_MOMENTS_COUNT).toBe(5);
  });

  it('VIDEO_MIME_ALLOWLIST_DEFAULT exposes the Phase 4 mime defaults and is immutable', () => {
    // Arrange + Act + Assert
    expect([...VIDEO_MIME_ALLOWLIST_DEFAULT]).toEqual([
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ]);
    expect(Object.isFrozen(VIDEO_MIME_ALLOWLIST_DEFAULT)).toBe(true);
  });
});
