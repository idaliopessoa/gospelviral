import { describe, it, expect } from 'vitest';
import { parseTranscriptLines, normalizeCueText } from './transcript-lines.js';
import {
  EDITOR_SINGLE_BLOCK,
  EDITOR_THREE_BLOCKS,
} from './__tests__/fixtures/editor-transcript.js';

describe('parseTranscriptLines', () => {
  it('parses MM:SS lines into { tsSec, text } with absolute seconds', () => {
    // Arrange
    const transcript = ['00:00 line zero', '00:30 line thirty'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 0, text: 'line zero' },
      { tsSec: 30, text: 'line thirty' },
    ]);
  });

  it('parses HH:MM:SS lines (hour-scale absolute seconds)', () => {
    // Arrange
    const transcript = ['01:00:00 one hour mark', '01:00:30 thirty after'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 3600, text: 'one hour mark' },
      { tsSec: 3630, text: 'thirty after' },
    ]);
  });

  it('merges a continuation line into its anchor cue text', () => {
    // Arrange
    const transcript = ['01:00 anchor', 'continuation', 'second continuation'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([
      { tsSec: 60, text: 'anchor continuation second continuation' },
    ]);
  });

  it('discards a continuation line that appears before any anchor', () => {
    // Arrange
    const transcript = ['orphan with no anchor', '00:30 anchored'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert
    expect(out).toEqual([{ tsSec: 30, text: 'anchored' }]);
  });

  it('rejects a malformed timestamp prefix (single-digit seconds) as a non-anchor', () => {
    // Arrange — "00:5" has 1-digit seconds; the strict prefix parser refuses it
    const transcript = ['00:5 not a real timestamp', '00:30 real'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — the malformed line is dropped (no anchor yet), only the valid one survives
    expect(out).toEqual([{ tsSec: 30, text: 'real' }]);
  });

  it('rejects a prefix whose minute/hour part holds a non-digit char as a non-anchor', () => {
    // Arrange — "0a" is 2 chars but not all digits; the strict parser refuses it
    const transcript = ['0a:30 garbled prefix', '00:30 real'].join('\n');

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — only the well-formed line becomes an anchor
    expect(out).toEqual([{ tsSec: 30, text: 'real' }]);
  });

  it('returns [] for empty string', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines('')).toEqual([]);
  });

  it('returns [] for non-string input', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines(null)).toEqual([]);
    expect(parseTranscriptLines(undefined)).toEqual([]);
    expect(parseTranscriptLines(42)).toEqual([]);
  });

  it('returns [] when no line carries a timestamp', () => {
    // Arrange + Act + Assert
    expect(parseTranscriptLines('just text\nmore text')).toEqual([]);
  });
});

describe('parseTranscriptLines — editor timecode export (D4)', () => {
  it('parses a HH:MM:SS:FF range block, dropping frames and skipping the speaker label', () => {
    // Arrange — real block: timecode RANGE / "Unknown" speaker line / spoken text
    // Act
    const out = parseTranscriptLines(EDITOR_SINGLE_BLOCK);

    // Assert — anchored on START (frames dropped), speaker stripped, clean text
    expect(out).toEqual([{ tsSec: 0, text: 'Santidade.' }]);
  });

  it('anchors on the range START in absolute seconds (frames never leak in)', () => {
    // Arrange — 01:28:25:10 → 1*3600 + 28*60 + 25 = 5305 (NOT 5305.33, NOT incl. frames)
    const block = '01:28:25:10 - 01:28:59:13\nUnknown\nVocê colocou essa aliança.';

    // Act
    const [cue] = parseTranscriptLines(block);

    // Assert
    expect(cue.tsSec).toBe(5305);
    expect(Number.isInteger(cue.tsSec)).toBe(true);
  });

  it('floors frames — a high frame field (29) never rounds the second up', () => {
    // Arrange — 00:00:00:29 at 30fps would be ~0.97s; we floor to the whole second 0
    const block = '00:00:00:29 - 00:00:01:00\nUnknown\nfim.';

    // Act
    const [cue] = parseTranscriptLines(block);

    // Assert
    expect(cue.tsSec).toBe(0);
  });

  it('parses consecutive editor blocks without cross-bleed', () => {
    // Arrange — three real consecutive blocks
    // Act
    const out = parseTranscriptLines(EDITOR_THREE_BLOCKS);

    // Assert
    expect(out).toEqual([
      { tsSec: 0, text: 'Santidade.' },
      { tsSec: 17, text: 'Oi? Os irmãos.' },
      { tsSec: 22, text: 'Procurar em seus lugares, sentar, se acalmar.' },
    ]);
  });

  it('merges multiple spoken-text lines after the speaker into one cue', () => {
    // Arrange — caption wrapped across two lines before the blank separator
    const block = '00:01:00:00 - 00:01:05:00\nUnknown\nFirst caption line\nsecond caption line';

    // Act
    const out = parseTranscriptLines(block);

    // Assert
    expect(out).toEqual([{ tsSec: 60, text: 'First caption line second caption line' }]);
  });

  it('strips the speaker label by position, not by the literal "Unknown"', () => {
    // Arrange — a named speaker; skip-by-position must still drop it
    const block = '00:00:10:00 - 00:00:12:00\nPastor João\nA paz do Senhor.';

    // Act
    const out = parseTranscriptLines(block);

    // Assert — only the spoken text survives; the speaker name is gone
    expect(out).toEqual([{ tsSec: 10, text: 'A paz do Senhor.' }]);
  });

  it('handles a mixed transcript (one MM:SS line + one editor block) in a single pass', () => {
    // Arrange — line-level detection, no global mode switch
    const transcript = ['00:05 plain line', '00:00:30:00 - 00:00:45:00\nUnknown\nbloco editor'].join(
      '\n',
    );

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — both formats yield correct anchors
    expect(out).toEqual([
      { tsSec: 5, text: 'plain line' },
      { tsSec: 30, text: 'bloco editor' },
    ]);
  });

  it('yields an empty-text anchor for a block with only a speaker line (no spoken text)', () => {
    // Arrange — anchor + speaker, then straight to the next anchor
    const transcript = '00:00:00:00 - 00:00:02:00\nUnknown\n\n00:00:02:00 - 00:00:04:00\nUnknown\noi';

    // Act
    const out = parseTranscriptLines(transcript);

    // Assert — first block has no text (downstream drops it); second carries text
    expect(out).toEqual([
      { tsSec: 0, text: '' },
      { tsSec: 2, text: 'oi' },
    ]);
  });

  it('does not treat a 3-field "HH:MM:SS - HH:MM:SS" range as an editor anchor (regression guard)', () => {
    // Arrange — only the 4-field FF range is the editor format; a 3-field clock
    // line keeps its frozen behavior (head parsed, " - END" trails as text).
    const out = parseTranscriptLines('01:23:45 - 01:24:00 intro');

    // Assert — frozen clock-anchor path: tsSec from head, the rest is text
    expect(out).toEqual([{ tsSec: 5025, text: '- 01:24:00 intro' }]);
  });
});

describe('normalizeCueText', () => {
  it('collapses internal whitespace to a single space', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('spaced   text   here')).toBe('spaced text here');
  });

  it('trims leading and trailing whitespace', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('  padded  ')).toBe('padded');
  });

  it('normalizes a whitespace-only string to empty', () => {
    // Arrange + Act + Assert
    expect(normalizeCueText('     ')).toBe('');
  });
});
