import { describe, it, expect } from 'vitest';
import { extractVideoId, timestampToSeconds, chunkText } from './helpers.js';

describe('extractVideoId', () => {
  it('returns the id from a watch?v= URL', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns the id from a youtu.be short URL', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns the id from an embed URL', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns the id from a /shorts/ URL', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://www.youtube.com/shorts/abc123XYZ')).toBe('abc123XYZ');
  });

  it('drops trailing query parameters', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('returns null on a non-YouTube URL', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('https://example.com/video')).toBeNull();
  });

  it('returns null on empty / null input', () => {
    // Arrange + Act + Assert
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId(null)).toBeNull();
  });
});

describe('timestampToSeconds', () => {
  it('parses MM:SS', () => {
    expect(timestampToSeconds('02:30')).toBe(150);
  });
  it('parses HH:MM:SS', () => {
    expect(timestampToSeconds('01:02:03')).toBe(3723);
  });
  it('returns 0 for falsy input', () => {
    expect(timestampToSeconds('')).toBe(0);
    expect(timestampToSeconds(null)).toBe(0);
    expect(timestampToSeconds(undefined)).toBe(0);
  });
  it('returns 0 for unparseable string', () => {
    expect(timestampToSeconds('not-a-timestamp')).toBe(0);
  });
});

describe('chunkText', () => {
  it('returns [""] on empty input', () => {
    expect(chunkText('', 20, 2)).toEqual(['']);
  });

  it('returns single chunk when text fits in one screen', () => {
    // Arrange
    const text = 'Olá mundo';

    // Act
    const out = chunkText(text, 20, 2); // 40 chars per chunk

    // Assert
    expect(out).toEqual(['Olá mundo']);
  });

  it('splits across multiple chunks when text exceeds chars*lines', () => {
    // Arrange
    const text = 'um dois três quatro cinco seis sete oito nove dez';

    // Act
    const out = chunkText(text, 10, 2); // 20 chars per chunk

    // Assert
    expect(out.length).toBeGreaterThan(1);
    for (const chunk of out) expect(chunk.length).toBeLessThanOrEqual(20);
  });

  it('keeps words intact at the boundary (no mid-word split)', () => {
    // Arrange
    const text = 'palavra-grande-de-vinte-e-um-chars curta';

    // Act
    const out = chunkText(text, 10, 1);

    // Assert — first chunk is the oversized word in isolation
    expect(out[0]).toBe('palavra-grande-de-vinte-e-um-chars');
    expect(out[1]).toBe('curta');
  });
});
