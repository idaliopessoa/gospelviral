import { describe, it, expect } from 'vitest';
import { validateAnalyzeBody } from './validation.js';

describe('validateAnalyzeBody', () => {
  const VALID = {
    url: 'https://www.youtube.com/watch?v=abc123XYZ',
    transcript: '00:00 hello\n00:12 world',
  };

  it('accepts a minimal valid body and defaults mode=auto, model=default', () => {
    // Arrange + Act
    const out = validateAnalyzeBody(VALID);

    // Assert
    expect(out).toEqual({
      ok: true,
      body: {
        url: VALID.url,
        transcript: VALID.transcript,
        mode: 'auto',
        model: 'default',
      },
    });
  });

  it('accepts explicit mode and model', () => {
    // Arrange + Act
    const out = validateAnalyzeBody({ ...VALID, mode: 'cli', model: 'fast' });

    // Assert
    expect(out.ok).toBe(true);
    expect(out.body.mode).toBe('cli');
    expect(out.body.model).toBe('fast');
  });

  it('rejects non-object bodies', () => {
    // Arrange + Act + Assert
    expect(validateAnalyzeBody(null).ok).toBe(false);
    expect(validateAnalyzeBody([]).ok).toBe(false);
    expect(validateAnalyzeBody('string').ok).toBe(false);
  });

  it('rejects missing url with code=invalid_url', () => {
    const out = validateAnalyzeBody({ ...VALID, url: '' });
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('invalid_url');
  });

  it('rejects missing transcript', () => {
    const out = validateAnalyzeBody({ ...VALID, transcript: '   ' });
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('invalid_transcript');
  });

  it('rejects transcript without MM:SS timestamp', () => {
    const out = validateAnalyzeBody({ ...VALID, transcript: 'no timestamps here' });
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('transcript_missing_timestamps');
  });

  it('rejects unknown mode', () => {
    const out = validateAnalyzeBody({ ...VALID, mode: 'turbo' });
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('invalid_mode');
  });

  it('rejects unknown model', () => {
    const out = validateAnalyzeBody({ ...VALID, model: 'opus' });
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('invalid_model');
  });

  it('trims url whitespace', () => {
    const out = validateAnalyzeBody({ ...VALID, url: `   ${VALID.url}   ` });
    expect(out.ok).toBe(true);
    expect(out.body.url).toBe(VALID.url);
  });
});
