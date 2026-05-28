import { describe, it, expect } from 'vitest';
import { OPTIMIZED_PROMPT } from './prompts.js';

describe('OPTIMIZED_PROMPT', () => {
  it('matches the artifact snapshot: length + first 80 + last 80 chars', () => {
    // Arrange
    const expectedLength = 4578;
    const expectedFirst80 =
      '# Analisador de Momentos Virais — Conteúdo Cristão\n\n<role>\nAnalista expert em co';
    const expectedLast80 =
      'form"},\n      "viral_reasoning": "por que viraliza"\n    }\n  ]\n}\n</output_schema>';

    // Act
    const actualLength = OPTIMIZED_PROMPT.length;
    const first80 = OPTIMIZED_PROMPT.slice(0, 80);
    const last80 = OPTIMIZED_PROMPT.slice(-80);

    // Assert
    expect(actualLength).toBe(expectedLength);
    expect(first80).toBe(expectedFirst80);
    expect(last80).toBe(expectedLast80);
  });

  it('declares the analyzer role, scoring weights, and the output_schema block', () => {
    // Arrange + Act
    const sample = OPTIMIZED_PROMPT;

    // Assert
    expect(sample).toContain('<role>');
    expect(sample).toContain('<scoring>');
    expect(sample).toContain('<output_schema>');
    expect(sample).toContain('Threshold viral: ≥ 6.5');
  });
});
