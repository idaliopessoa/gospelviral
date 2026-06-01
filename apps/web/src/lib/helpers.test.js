import { describe, it, expect } from 'vitest';
import { vi, afterEach } from 'vitest';
import {
  extractVideoId,
  timestampToSeconds,
  chunkText,
  selectVisibleChunk,
  deriveSubtitleFontPx,
  measureCharAdvanceEm,
  SUBTITLE_LINE_MAX_FRACTION,
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

describe('deriveSubtitleFontPx (TASK_022 — chars-driven subtitle size)', () => {
  it('shrinks the font as charsPerScreen grows (more chars per line)', () => {
    // Act
    const few = deriveSubtitleFontPx(280, 18, 'M');
    const many = deriveSubtitleFontPx(280, 36, 'M');

    // Assert
    expect(few).toBeGreaterThan(many);
  });

  it('grows the font with size S < M < L for the same chars', () => {
    // Act + Assert
    const s = deriveSubtitleFontPx(280, 30, 'S');
    const m = deriveSubtitleFontPx(280, 30, 'M');
    const l = deriveSubtitleFontPx(280, 30, 'L');
    expect(s).toBeLessThan(m);
    expect(m).toBeLessThan(l);
  });

  it('scales with the canvas width (preview == export proportion)', () => {
    // Arrange — 1080 export is the 280 preview scaled up; ratio must match
    const preview = deriveSubtitleFontPx(280, 30, 'L');
    const exported = deriveSubtitleFontPx(1080, 30, 'L');

    // Assert — same chars+size → font ∝ canvas width
    expect(exported / preview).toBeCloseTo(1080 / 280, 1);
  });

  it('sizes charsPerScreen real chars to fit one line for the font it is given (lines stays a true cap)', () => {
    // Arrange — derive against a font's actual advance, then render with the SAME advance
    const canvas = 280;
    const chars = 30;
    const wrap = canvas * SUBTITLE_LINE_MAX_FRACTION;
    for (const advance of [0.345, 0.5, 0.58]) {
      const fontPx = deriveSubtitleFontPx(canvas, chars, 'L', advance);

      // Act — real line width of charsPerScreen chars in that font
      const lineWidth = chars * advance * fontPx;

      // Assert — fills ≤ the wrap width (so a charsPerScreen-char line never wraps)
      expect(lineWidth).toBeLessThanOrEqual(wrap + 0.5);
    }
  });

  it('falls back to a sane advance when none/zero is given (jsdom)', () => {
    // Act + Assert — no divide-by-zero, finite px
    expect(Number.isFinite(deriveSubtitleFontPx(280, 30, 'L', 0))).toBe(true);
    expect(deriveSubtitleFontPx(280, 30, 'L')).toBeGreaterThan(0);
  });

  it('guards charsPerScreen = 0 (no divide-by-zero)', () => {
    // Act + Assert
    expect(Number.isFinite(deriveSubtitleFontPx(280, 0, 'M'))).toBe(true);
  });
});

describe('measureCharAdvanceEm (TASK_022)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the measured advance per em from a 2D context', () => {
    // Arrange — stub a context whose measureText is 55% of font-size per char
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (s) => ({ width: s.length * 55 }), // 100px font ⇒ 0.55/char
    });

    // Act — unique font name to dodge the module memo cache
    const advance = measureCharAdvanceEm('TestFont-Wide-1');

    // Assert
    expect(advance).toBeCloseTo(0.55, 2);
  });

  it('falls back to ~0.5 when no 2D context is available', () => {
    // Arrange — jsdom-style: getContext → null
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    // Act
    const advance = measureCharAdvanceEm('TestFont-NoCanvas-2');

    // Assert
    expect(advance).toBeCloseTo(0.5, 2);
  });
});
