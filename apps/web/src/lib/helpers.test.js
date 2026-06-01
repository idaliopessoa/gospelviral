import { describe, it, expect } from 'vitest';
import { vi, afterEach } from 'vitest';
import {
  extractVideoId,
  timestampToSeconds,
  chunkText,
  selectVisibleChunk,
  deriveSubtitleFontPx,
  subtitleCharsPerLine,
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

describe('deriveSubtitleFontPx (TASK_022 — size-driven, chars-independent)', () => {
  it('does NOT change with charsPerScreen (font depends only on size)', () => {
    // Act — chars/tela slider must never move the font size
    const a = deriveSubtitleFontPx(280, 'M');
    const b = deriveSubtitleFontPx(280, 'M');

    // Assert — same size+canvas → same px regardless of any chars value
    expect(a).toBe(b);
  });

  it('grows the font with size S < M < L', () => {
    // Act + Assert
    expect(deriveSubtitleFontPx(280, 'S')).toBeLessThan(deriveSubtitleFontPx(280, 'M'));
    expect(deriveSubtitleFontPx(280, 'M')).toBeLessThan(deriveSubtitleFontPx(280, 'L'));
  });

  it('scales with the canvas width (preview == export proportion)', () => {
    // Arrange — 1080 export is the 280 preview scaled up; ratio must match
    const preview = deriveSubtitleFontPx(280, 'L');
    const exported = deriveSubtitleFontPx(1080, 'L');

    // Assert
    expect(exported / preview).toBeCloseTo(1080 / 280, 1);
  });
});

describe('subtitleCharsPerLine (TASK_022 — chars/tela = line width, capped to fit)', () => {
  it('returns the desired chars when they fit one line', () => {
    // Arrange — small font, wide canvas → 20 chars fit
    const fontPx = deriveSubtitleFontPx(280, 'S');

    // Act
    const perLine = subtitleCharsPerLine(20, 280, fontPx, 0.5);

    // Assert
    expect(perLine).toBe(20);
  });

  it('caps charsPerScreen to what fits at the (size-driven) font + wide font', () => {
    // Arrange — big font + widest advance → far fewer than 60 fit
    const fontPx = deriveSubtitleFontPx(280, 'L');

    // Act — ask for 60; only the fitting count comes back
    const perLine = subtitleCharsPerLine(60, 280, fontPx, 0.58);

    // Assert — capped below the requested 60, and a positive count
    expect(perLine).toBeLessThan(60);
    expect(perLine).toBeGreaterThanOrEqual(1);
  });

  it('keeps a perLine-char line within the wrap width (lines stays a true cap)', () => {
    // Arrange
    const canvas = 280;
    const wrap = canvas * SUBTITLE_LINE_MAX_FRACTION;
    for (const advance of [0.345, 0.5, 0.58]) {
      const fontPx = deriveSubtitleFontPx(canvas, 'L');
      const perLine = subtitleCharsPerLine(40, canvas, fontPx, advance);

      // Act — real width of perLine chars
      const lineWidth = perLine * advance * fontPx;

      // Assert — fits the wrap (so a perLine-char line never wraps)
      expect(lineWidth).toBeLessThanOrEqual(wrap + 0.5);
    }
  });

  it('guards charsPerScreen = 0 / missing advance (no divide-by-zero, ≥ 1)', () => {
    const fontPx = deriveSubtitleFontPx(280, 'M');
    expect(subtitleCharsPerLine(0, 280, fontPx)).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(subtitleCharsPerLine(30, 280, fontPx, 0))).toBe(true);
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
