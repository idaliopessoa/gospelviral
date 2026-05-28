import { describe, it, expect } from 'vitest';
import { buildUserMessage } from './build-user-message.js';
import {
  EXAMPLE_USER_MESSAGE_HEAD,
  EXAMPLE_USER_MESSAGE_TAIL,
} from './__fixtures__/full-prompt.fixture.js';
import { EXAMPLE_TRANSCRIPT } from '@gospelviral/shared';

describe('buildUserMessage', () => {
  it('wraps the transcript in <transcript> tags and appends the analysis instruction', () => {
    // Arrange
    const transcript = '00:00 hello\n00:12 world';

    // Act
    const message = buildUserMessage(transcript);

    // Assert
    expect(message).toMatch(/^<transcript>\n/);
    expect(message).toContain(transcript);
    expect(message).toMatch(
      /<\/transcript>\n\nExecute análise completa\. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente\. APENAS JSON, sem texto adicional\.$/,
    );
  });

  it('matches the artifact composition byte-for-byte for EXAMPLE_TRANSCRIPT', () => {
    // Arrange + Act
    const message = buildUserMessage(EXAMPLE_TRANSCRIPT);

    // Assert — head + transcript + tail in order
    expect(message.startsWith(EXAMPLE_USER_MESSAGE_HEAD)).toBe(true);
    expect(message.endsWith(EXAMPLE_USER_MESSAGE_TAIL)).toBe(true);
    expect(message).toBe(
      EXAMPLE_USER_MESSAGE_HEAD + EXAMPLE_TRANSCRIPT + '\n' + EXAMPLE_USER_MESSAGE_TAIL,
    );
  });

  it('throws TypeError on empty input', () => {
    // Arrange + Act + Assert
    expect(() => buildUserMessage('')).toThrow(TypeError);
    expect(() => buildUserMessage(null)).toThrow(TypeError);
    expect(() => buildUserMessage(undefined)).toThrow(TypeError);
  });
});
