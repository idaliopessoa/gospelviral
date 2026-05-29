import { describe, it, expect } from 'vitest';
import * as shared from './index.js';

describe('@gospelviral/shared barrel', () => {
  it('exposes the canonical surface for downstream consumers', () => {
    // Arrange
    const expected = [
      'CANVAS_REFERENCE',
      'SUBTITLE_ANCHOR_PERCENT',
      'ANALYSIS_RESPONSE_REQUIRED_KEYS',
      'TOP_MOMENTS_COUNT',
      'AnalysisResponseError',
      'parseAnalysisResponse',
      'OPTIMIZED_PROMPT',
      'EXAMPLE_URL',
      'EXAMPLE_TRANSCRIPT',
      'EXAMPLE_RESPONSE',
      'timestampToSeconds',
      'parseTranscriptLines',
      'normalizeCueText',
      'buildSubtitleCues',
    ];

    // Act
    const actual = Object.keys(shared);

    // Assert
    for (const key of expected) {
      expect(actual).toContain(key);
    }
  });
});
