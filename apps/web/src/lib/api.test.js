import { describe, it, expect } from 'vitest';
import { analyzeMoments } from './api.js';
import { EXAMPLE_RESPONSE, EXAMPLE_TRANSCRIPT, EXAMPLE_URL } from '@gospelviral/shared';

describe('analyzeMoments (placeholder)', () => {
  it('returns EXAMPLE_RESPONSE when input matches the example fixture', async () => {
    // Arrange + Act
    const out = await analyzeMoments({
      url: EXAMPLE_URL,
      transcript: EXAMPLE_TRANSCRIPT,
    });

    // Assert
    expect(out).toBe(EXAMPLE_RESPONSE);
  });

  it('throws "backend not wired yet — TASK_010" for any other input', async () => {
    // Arrange + Act + Assert
    await expect(
      analyzeMoments({ url: 'https://other.example/v=xyz', transcript: '00:00 hi' }),
    ).rejects.toThrow(/backend not wired yet — TASK_010/);
  });
});
