import { describe, it, expect, vi } from 'vitest';
import { runViaApi } from './claude-api.js';
import {
  AdapterConfigError,
  AdapterTransportError,
} from './errors.js';
import {
  AnalysisResponseError,
  EXAMPLE_RESPONSE,
} from '@gospelviral/shared';

const ARGS = {
  systemPrompt: 'system',
  userMessage: 'user',
  modelId: 'claude-opus-4-7',
  apiKey: 'sk-ant-test-FAKE-1234567890abcdef',
};

function ok(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function failStatus(status, body = {}) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('runViaApi', () => {
  it('throws AdapterConfigError when apiKey is missing', async () => {
    // Arrange + Act + Assert
    await expect(
      runViaApi({ ...ARGS, apiKey: undefined, fetchImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(AdapterConfigError);
  });

  it('returns the parsed AnalysisResponse on happy path', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      ok({ content: [{ type: 'text', text: JSON.stringify(EXAMPLE_RESPONSE) }] }),
    );

    // Act
    const out = await runViaApi({ ...ARGS, fetchImpl });

    // Assert
    expect(out.metadata.total_duration).toBe('09:55');
    expect(out.top_moments).toHaveLength(5);
    expect(out.top_moments[0].hook_title).toBe(
      EXAMPLE_RESPONSE.top_moments[0].hook_title,
    );
  });

  it('sends x-api-key + anthropic-version + model + messages in the POST body', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      ok({ content: [{ type: 'text', text: JSON.stringify(EXAMPLE_RESPONSE) }] }),
    );

    // Act
    await runViaApi({ ...ARGS, fetchImpl });

    // Assert
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe(ARGS.apiKey);
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-opus-4-7');
    expect(body.max_tokens).toBe(8000);
    expect(body.system).toBe('system');
    expect(body.messages).toEqual([{ role: 'user', content: 'user' }]);
  });

  it('overrides max_tokens when provided', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      ok({ content: [{ type: 'text', text: JSON.stringify(EXAMPLE_RESPONSE) }] }),
    );

    // Act
    await runViaApi({ ...ARGS, maxTokens: 16_000, fetchImpl });

    // Assert
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(16_000);
  });

  it('throws AdapterTransportError(http_auth) on HTTP 401 with no api-key bytes in message', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(failStatus(401));

    // Act + Assert
    try {
      await runViaApi({ ...ARGS, fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdapterTransportError);
      expect(err.code).toBe('http_auth');
      expect(err.status).toBe(401);
      expect(err.message).not.toContain(ARGS.apiKey);
      expect(err.message).not.toContain(ARGS.apiKey.slice(-8));
    }
  });

  it('throws AdapterTransportError(http_5xx) with retryable=true on HTTP 500', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(failStatus(500));

    // Act + Assert
    try {
      await runViaApi({ ...ARGS, fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdapterTransportError);
      expect(err.code).toBe('http_5xx');
      expect(err.retryable).toBe(true);
    }
  });

  it('throws AdapterTransportError(http_rate_limit) with retryable=true on 429', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(failStatus(429));

    // Act + Assert
    try {
      await runViaApi({ ...ARGS, fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('http_rate_limit');
      expect(err.retryable).toBe(true);
    }
  });

  it('throws AdapterTransportError(network) when fetch rejects', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    // Act + Assert
    try {
      await runViaApi({ ...ARGS, fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdapterTransportError);
      expect(err.code).toBe('network');
      expect(err.retryable).toBe(true);
    }
  });

  it('re-throws AbortError unchanged when the signal aborts', async () => {
    // Arrange
    const abortErr = new Error('Aborted');
    abortErr.name = 'AbortError';
    const fetchImpl = vi.fn().mockRejectedValue(abortErr);

    // Act + Assert
    await expect(runViaApi({ ...ARGS, fetchImpl })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('propagates AnalysisResponseError when payload is missing top_moments', async () => {
    // Arrange — shared parser is the validation owner; this adapter must NOT
    // implement its own parsing
    const partial = {
      metadata: EXAMPLE_RESPONSE.metadata,
      analysis_summary: EXAMPLE_RESPONSE.analysis_summary,
    };
    const fetchImpl = vi.fn().mockReturnValue(
      ok({ content: [{ type: 'text', text: JSON.stringify(partial) }] }),
    );

    // Act + Assert
    try {
      await runViaApi({ ...ARGS, fetchImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AnalysisResponseError);
      expect(err.code).toBe('missing_top_moments');
    }
  });

  it('joins multiple text blocks before parsing', async () => {
    // Arrange — Anthropic may return prose then JSON in separate blocks
    const fetchImpl = vi.fn().mockReturnValue(
      ok({
        content: [
          { type: 'text', text: 'Aqui está a análise:\n' },
          { type: 'text', text: JSON.stringify(EXAMPLE_RESPONSE) },
        ],
      }),
    );

    // Act
    const out = await runViaApi({ ...ARGS, fetchImpl });

    // Assert
    expect(out.top_moments).toHaveLength(5);
  });
});
