import { describe, it, expect } from 'vitest';
import { highlightText, splitByRegex } from './text-highlight.js';

describe('highlightText', () => {
  it('returns a single empty part on empty input', () => {
    // Arrange + Act
    const parts = highlightText('', { highlightScripture: true, highlightKeywords: true });

    // Assert
    expect(parts).toEqual([{ text: '', highlighted: false, type: null }]);
  });

  it('returns the raw text wrapped in a single part when both flags are off', () => {
    // Arrange + Act
    const parts = highlightText('Jesus me ama', {});

    // Assert
    expect(parts).toEqual([{ text: 'Jesus me ama', highlighted: false, type: null }]);
  });

  it('marks scripture references with type=scripture', () => {
    // Arrange
    const text = 'Conforme Salmos 34:18 nos lembra.';

    // Act
    const parts = highlightText(text, { highlightScripture: true });

    // Assert
    const scripture = parts.find((p) => p.type === 'scripture');
    expect(scripture).toBeDefined();
    expect(scripture.text).toBe('Salmos 34:18');
    expect(scripture.highlighted).toBe(true);
  });

  it('marks Jesus / Deus keywords with type=keyword', () => {
    // Arrange
    const text = 'Jesus é o caminho até Deus.';

    // Act
    const parts = highlightText(text, { highlightKeywords: true });

    // Assert
    const tags = parts.filter((p) => p.type === 'keyword').map((p) => p.text);
    expect(tags).toContain('Jesus');
    expect(tags).toContain('Deus');
  });

  it('preserves prior scripture highlights when keyword pass runs after', () => {
    // Arrange
    const text = 'Jesus disse, vide Salmos 34:18.';

    // Act
    const parts = highlightText(text, {
      highlightScripture: true,
      highlightKeywords: true,
    });

    // Assert — scripture token stays a single contiguous part
    const scripture = parts.find((p) => p.type === 'scripture');
    expect(scripture.text).toBe('Salmos 34:18');
    const keyword = parts.find((p) => p.type === 'keyword');
    expect(keyword.text).toBe('Jesus');
  });

  it('matches Portuguese book names that begin with an ASCII letter (Gênesis, João, Romanos)', () => {
    // Arrange + Act
    // Note: JS \b is ASCII-only, so books beginning with a non-ASCII letter
    // (e.g. "Êxodo") at a position adjacent to a non-word char will not match.
    // The artifact behaves the same; preserved here for byte-equivalent semantics.
    const samples = [
      ['Vê Gênesis 1:1.', 'Gênesis 1:1'],
      ['João 3:16 é central.', 'João 3:16'],
      ['Romanos 5:1 abre o argumento.', 'Romanos 5:1'],
    ];

    // Assert
    for (const [text, expected] of samples) {
      const parts = highlightText(text, { highlightScripture: true });
      const ref = parts.find((p) => p.type === 'scripture');
      expect(ref?.text).toBe(expected);
    }
  });
});

describe('splitByRegex', () => {
  it('passes already-highlighted parts through untouched', () => {
    // Arrange
    const input = [
      { text: 'Salmos 34:18', highlighted: true, type: 'scripture' },
      { text: ' diz Jesus', highlighted: false, type: null },
    ];
    const re = /Jesus/g;

    // Act
    const out = splitByRegex(input, re, 'keyword');

    // Assert
    expect(out[0]).toEqual(input[0]);
    expect(out.find((p) => p.type === 'keyword')?.text).toBe('Jesus');
  });
});
