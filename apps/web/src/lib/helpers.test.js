import { describe, it, expect } from 'vitest';
import {
  extractVideoId,
  timestampToSeconds,
  chunkText,
  selectVisibleChunk,
} from './helpers.js';

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

describe('selectVisibleChunk (D3 — panel SSOT)', () => {
  const SHAPE = { charsPerScreen: 10, lines: 1 }; // 10 chars per chunk
  // 5 words → multiple chunks: ['um dois', 'tres', 'quatro', 'cinco']-ish
  const LONG = 'um dois tres quatro cinco seis sete oito';

  it('returns the single chunk unchanged when the text fits one screen', () => {
    // Act
    const out = selectVisibleChunk('curto', 50, { start: 0, end: 100 }, SHAPE);

    // Assert
    expect(out).toBe('curto');
  });

  it('returns chunk[0] at the window start', () => {
    // Arrange
    const chunks = chunkText(LONG, SHAPE.charsPerScreen, SHAPE.lines);

    // Act — t === start
    const out = selectVisibleChunk(LONG, 0, { start: 0, end: 100 }, SHAPE);

    // Assert
    expect(out).toBe(chunks[0]);
  });

  it('returns the last chunk near the window end (clamped, never overflows)', () => {
    // Arrange
    const chunks = chunkText(LONG, SHAPE.charsPerScreen, SHAPE.lines);

    // Act — t just below end, and t beyond end (clamp)
    const nearEnd = selectVisibleChunk(LONG, 99, { start: 0, end: 100 }, SHAPE);
    const beyond = selectVisibleChunk(LONG, 999, { start: 0, end: 100 }, SHAPE);

    // Assert
    expect(nearEnd).toBe(chunks[chunks.length - 1]);
    expect(beyond).toBe(chunks[chunks.length - 1]);
  });

  it('advances to a middle chunk for a mid-window time', () => {
    // Arrange
    const chunks = chunkText(LONG, SHAPE.charsPerScreen, SHAPE.lines);
    const mid = Math.floor(chunks.length / 2);

    // Act — place currentTime in the middle bucket
    const perChunk = 100 / chunks.length;
    const t = mid * perChunk + perChunk / 2;
    const out = selectVisibleChunk(LONG, t, { start: 0, end: 100 }, SHAPE);

    // Assert
    expect(out).toBe(chunks[mid]);
  });

  it('honors charsPerScreen — a wider screen yields a longer chunk[0]', () => {
    // Act
    const narrow = selectVisibleChunk(LONG, 0, { start: 0, end: 100 }, { charsPerScreen: 8, lines: 1 });
    const wide = selectVisibleChunk(LONG, 0, { start: 0, end: 100 }, { charsPerScreen: 40, lines: 1 });

    // Assert — same text + time, different shape → different chunking
    expect(wide.length).toBeGreaterThan(narrow.length);
  });

  it('honors lines — more lines scales chunk capacity (chars*lines)', () => {
    // Act
    const oneLine = selectVisibleChunk(LONG, 0, { start: 0, end: 100 }, { charsPerScreen: 10, lines: 1 });
    const threeLines = selectVisibleChunk(LONG, 0, { start: 0, end: 100 }, { charsPerScreen: 10, lines: 3 });

    // Assert
    expect(threeLines.length).toBeGreaterThan(oneLine.length);
  });

  it('falls back to chunk[0] for a zero/negative-duration window', () => {
    // Arrange
    const chunks = chunkText(LONG, SHAPE.charsPerScreen, SHAPE.lines);

    // Act
    const out = selectVisibleChunk(LONG, 50, { start: 50, end: 50 }, SHAPE);

    // Assert
    expect(out).toBe(chunks[0]);
  });
});
