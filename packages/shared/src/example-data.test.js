import { describe, it, expect } from 'vitest';
import {
  EXAMPLE_URL,
  EXAMPLE_TRANSCRIPT,
  EXAMPLE_RESPONSE,
} from './example-data.js';

describe('example-data fixtures', () => {
  it('EXAMPLE_URL points at the artifact YouTube reference', () => {
    // Arrange
    const expected = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act + Assert
    expect(EXAMPLE_URL).toBe(expected);
  });

  it('EXAMPLE_TRANSCRIPT preserves length and the opening line', () => {
    // Arrange
    const expectedLength = 3275;
    const expectedFirstLine =
      '00:00 Bom dia, igreja. Hoje quero falar de algo que mudou completamente a minha forma de ver Deus.';

    // Act
    const actualFirstLine = EXAMPLE_TRANSCRIPT.split('\n')[0];

    // Assert
    expect(EXAMPLE_TRANSCRIPT.length).toBe(expectedLength);
    expect(actualFirstLine).toBe(expectedFirstLine);
  });

  it('EXAMPLE_RESPONSE deep-equals the artifact constant on critical fields', () => {
    // Arrange — spot-check fixture, one assertion per critical leaf
    // Act
    const moments = EXAMPLE_RESPONSE.top_moments;

    // Assert
    expect(EXAMPLE_RESPONSE.metadata.total_duration).toBe('09:55');
    expect(EXAMPLE_RESPONSE.metadata.content_type).toBe('pregação');
    expect(EXAMPLE_RESPONSE.analysis_summary.candidates_above_threshold).toBe(7);
    expect(EXAMPLE_RESPONSE.analysis_summary.top_moments_selected).toBe(5);
    expect(EXAMPLE_RESPONSE.analysis_summary.balance).toEqual({
      evangelization: '60%',
      edification: '40%',
    });
    expect(moments).toHaveLength(5);
    expect(moments.map((m) => m.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(moments[0].hook_title).toBe('A oração das 3h que mudou minha vida');
    expect(moments[0].viral_score).toBe(8.7);
    expect(moments[0].theological_check.christ_centered).toBe(true);
    expect(moments[0].cold_open_analysis.decision).toBe('apply_cold_open');
    expect(moments[1].key_quote).toBe(
      'A fidelidade de Deus não depende do resultado. Ela depende do caráter dele',
    );
    expect(moments[2].theme).toBe('A promessa de Deus no sofrimento');
    expect(moments[3].content_purpose).toBe('edification');
    expect(moments[4].key_scripture.reference).toBe('Romanos 5:1');
  });
});
