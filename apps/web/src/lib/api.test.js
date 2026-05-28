import { describe, it, expect, vi } from 'vitest';
import { analyzeMoments, AnalyzeClientError } from './api.js';
import {
  EXAMPLE_RESPONSE,
  EXAMPLE_TRANSCRIPT,
  EXAMPLE_URL,
} from '@gospelviral/shared';

function okEnvelope(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'ok', data }),
  });
}

function errEnvelope(status, body) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body ?? null),
  });
}

const REAL = {
  url: 'https://www.youtube.com/watch?v=abc123XYZ',
  transcript: '00:00 line one\n00:12 line two',
};

describe('analyzeMoments', () => {
  it('short-circuits to EXAMPLE_RESPONSE when input matches the example fixture', async () => {
    // Arrange — fetchImpl must not be called
    const fetchImpl = vi.fn();

    // Act
    const out = await analyzeMoments(
      { url: EXAMPLE_URL, transcript: EXAMPLE_TRANSCRIPT },
      { fetchImpl },
    );

    // Assert
    expect(out).toBe(EXAMPLE_RESPONSE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs to /api/analyze and unwraps a 200 envelope', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(okEnvelope(EXAMPLE_RESPONSE));

    // Act
    const out = await analyzeMoments(REAL, { fetchImpl });

    // Assert
    expect(out).toEqual(EXAMPLE_RESPONSE);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/analyze');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ url: REAL.url, transcript: REAL.transcript });
  });

  it('omits mode/model from the body when they are auto/default', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(okEnvelope(EXAMPLE_RESPONSE));

    // Act
    await analyzeMoments({ ...REAL, mode: 'auto', model: 'default' }, { fetchImpl });

    // Assert
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({ url: REAL.url, transcript: REAL.transcript });
  });

  it('includes mode + model when explicitly overridden', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(okEnvelope(EXAMPLE_RESPONSE));

    // Act
    await analyzeMoments({ ...REAL, mode: 'cli', model: 'fast' }, { fetchImpl });

    // Assert
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({ url: REAL.url, transcript: REAL.transcript, mode: 'cli', model: 'fast' });
  });

  it('wraps fetch network errors in AnalyzeClientError(network) with PT-BR message', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    // Act + Assert
    try {
      await analyzeMoments(REAL, { fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AnalyzeClientError);
      expect(err.code).toBe('network');
      expect(err.message).toMatch(/Servidor backend inacessível/);
    }
  });

  it('re-throws AbortError unchanged when the signal aborts', async () => {
    // Arrange
    const aerr = new Error('Aborted');
    aerr.name = 'AbortError';
    const fetchImpl = vi.fn().mockRejectedValue(aerr);

    // Act + Assert
    await expect(analyzeMoments(REAL, { fetchImpl })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('maps a 4xx error envelope to AnalyzeClientError with the server code', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      errEnvelope(400, {
        status: 'error',
        code: 'transcript_missing_timestamps',
        message: 'Transcript must include MM:SS timestamps.',
      }),
    );

    // Act + Assert
    try {
      await analyzeMoments(REAL, { fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('transcript_missing_timestamps');
      expect(err.message).toMatch(/MM:SS/);
    }
  });

  it('maps a 502 envelope to AnalyzeClientError with server-supplied code', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      errEnvelope(502, { status: 'error', code: 'adapter_failed', message: 'fail' }),
    );

    // Act + Assert
    try {
      await analyzeMoments(REAL, { fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('adapter_failed');
    }
  });

  it('maps a 504 envelope to AnalyzeClientError with code=timeout', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      errEnvelope(504, { status: 'error', code: 'timeout', message: 'too slow' }),
    );

    // Act + Assert
    try {
      await analyzeMoments(REAL, { fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('timeout');
    }
  });
});
