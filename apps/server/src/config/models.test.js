import { describe, it, expect, vi } from 'vitest';
import { resolveModel, MODEL_SLUGS } from './models.js';

describe('resolveModel', () => {
  it('returns the opus slug for "default"', () => {
    // Arrange + Act + Assert
    expect(resolveModel('default')).toBe(MODEL_SLUGS.default);
    expect(MODEL_SLUGS.default).toMatch(/^claude-opus/);
  });

  it('returns the sonnet slug for "fast"', () => {
    // Arrange + Act + Assert
    expect(resolveModel('fast')).toBe(MODEL_SLUGS.fast);
    expect(MODEL_SLUGS.fast).toMatch(/^claude-sonnet/);
  });

  it('returns the haiku slug for "debug"', () => {
    // Arrange + Act + Assert
    expect(resolveModel('debug')).toBe(MODEL_SLUGS.debug);
    expect(MODEL_SLUGS.debug).toMatch(/^claude-haiku/);
  });

  it('falls back to default and warns on unknown preference', () => {
    // Arrange
    const warn = vi.fn();
    const logger = { warn };

    // Act
    const slug = resolveModel('garbage', logger);

    // Assert
    expect(slug).toBe(MODEL_SLUGS.default);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/Unknown model preference/),
      expect.objectContaining({ preference: 'garbage', fallback: MODEL_SLUGS.default }),
    );
  });

  it('does not throw on unknown preference even without a logger', () => {
    // Arrange + Act + Assert
    expect(() => resolveModel('nonsense')).not.toThrow();
    expect(resolveModel('nonsense')).toBe(MODEL_SLUGS.default);
  });

  it('MODEL_SLUGS is frozen', () => {
    // Arrange + Act + Assert
    expect(Object.isFrozen(MODEL_SLUGS)).toBe(true);
  });
});
