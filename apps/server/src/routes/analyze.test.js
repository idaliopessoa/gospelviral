import { describe, it, expect, vi } from 'vitest';
import { createAnalyzeRouter } from './analyze.js';
import {
  AdapterTransportError,
  AdapterConfigError,
} from '../runtime/errors.js';
import {
  AnalysisResponseError,
  EXAMPLE_RESPONSE,
  EXAMPLE_TRANSCRIPT,
  EXAMPLE_URL,
} from '@gospelviral/shared';

const VALID_BODY = { url: EXAMPLE_URL, transcript: EXAMPLE_TRANSCRIPT };

function makeRequest(body) {
  return new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function withDeps({ runViaCli, runViaApi, detection, timeoutMs }) {
  return createAnalyzeRouter({
    runViaCli: runViaCli ?? vi.fn().mockResolvedValue(EXAMPLE_RESPONSE),
    runViaApi: runViaApi ?? vi.fn().mockResolvedValue(EXAMPLE_RESPONSE),
    detectRuntime: vi.fn().mockResolvedValue(
      detection ?? {
        cli: { available: true, binPath: '/usr/local/bin/claude', name: 'claude' },
        apiKey: true,
        recommended: 'cli',
      },
    ),
    timeoutMs: timeoutMs ?? 60_000,
  });
}

describe('POST /api/analyze', () => {
  it('returns 200 with AnalysisResponse when mode is auto and CLI is recommended', async () => {
    // Arrange
    const runViaCli = vi.fn().mockResolvedValue(EXAMPLE_RESPONSE);
    const runViaApi = vi.fn();
    const app = withDeps({ runViaCli, runViaApi });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.data.top_moments).toHaveLength(5);
    expect(runViaCli).toHaveBeenCalled();
    expect(runViaApi).not.toHaveBeenCalled();
  });

  it('forces the API adapter when mode=api', async () => {
    // Arrange
    const runViaCli = vi.fn();
    const runViaApi = vi.fn().mockResolvedValue(EXAMPLE_RESPONSE);
    const app = withDeps({ runViaCli, runViaApi });

    // Act
    const res = await app.fetch(makeRequest({ ...VALID_BODY, mode: 'api' }));

    // Assert
    expect(res.status).toBe(200);
    expect(runViaApi).toHaveBeenCalled();
    expect(runViaCli).not.toHaveBeenCalled();
  });

  it('returns 503 cli_unavailable when mode=cli but CLI absent', async () => {
    // Arrange
    const app = withDeps({
      detection: {
        cli: { available: false },
        apiKey: true,
        recommended: 'api',
      },
    });

    // Act
    const res = await app.fetch(makeRequest({ ...VALID_BODY, mode: 'cli' }));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(503);
    expect(body.code).toBe('cli_unavailable');
  });

  it('returns 503 api_key_missing when mode=api but key absent', async () => {
    // Arrange
    const app = withDeps({
      detection: {
        cli: { available: true, binPath: '/usr/local/bin/claude', name: 'claude' },
        apiKey: false,
        recommended: 'cli',
      },
    });

    // Act
    const res = await app.fetch(makeRequest({ ...VALID_BODY, mode: 'api' }));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(503);
    expect(body.code).toBe('api_key_missing');
  });

  it('returns 503 no_runtime_available when neither mode is available (auto)', async () => {
    // Arrange
    const app = withDeps({
      detection: { cli: { available: false }, apiKey: false, recommended: 'none' },
    });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(503);
    expect(body.code).toBe('no_runtime_available');
  });

  it('returns 400 invalid_body on missing transcript', async () => {
    // Arrange
    const app = withDeps({});

    // Act
    const res = await app.fetch(makeRequest({ url: EXAMPLE_URL }));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.code).toBe('invalid_transcript');
  });

  it('returns 400 transcript_missing_timestamps when no MM:SS pattern', async () => {
    // Arrange
    const app = withDeps({});

    // Act
    const res = await app.fetch(
      makeRequest({ url: EXAMPLE_URL, transcript: 'no timestamps' }),
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.code).toBe('transcript_missing_timestamps');
  });

  it('returns 400 invalid_body on non-JSON payload', async () => {
    // Arrange
    const app = withDeps({});

    // Act
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await app.fetch(req);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.code).toBe('invalid_body');
  });

  it('returns 502 parse_failed when adapter throws AnalysisResponseError', async () => {
    // Arrange
    const runViaCli = vi.fn().mockRejectedValue(
      new AnalysisResponseError('missing_top_moments', 'no moments'),
    );
    const app = withDeps({ runViaCli });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(502);
    expect(body.code).toBe('parse_failed');
    expect(body.message).not.toContain('no moments'); // payload content not leaked
  });

  it('returns 502 adapter_failed on AdapterTransportError', async () => {
    // Arrange
    const runViaCli = vi.fn().mockRejectedValue(
      new AdapterTransportError('cli_nonzero_exit', 'sensitive stderr leak here'),
    );
    const app = withDeps({ runViaCli });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(502);
    expect(body.code).toBe('adapter_failed');
    expect(body.message).toBe('Adapter call failed (cli_nonzero_exit).');
    expect(body.message).not.toContain('sensitive');
  });

  it('returns 503 runtime_misconfigured on AdapterConfigError', async () => {
    // Arrange
    const runViaCli = vi.fn().mockRejectedValue(
      new AdapterConfigError('missing_bin_path', 'no bin'),
    );
    const app = withDeps({ runViaCli });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(503);
    expect(body.code).toBe('runtime_misconfigured');
  });

  it('returns 504 timeout when the adapter exceeds the configured timeout', async () => {
    // Arrange
    const runViaCli = vi.fn((args) =>
      new Promise((_, reject) => {
        args.signal.addEventListener('abort', () => {
          const e = new Error('Aborted');
          e.name = 'AbortError';
          reject(e);
        });
      }),
    );
    const app = withDeps({ runViaCli, timeoutMs: 5 });

    // Act
    const res = await app.fetch(makeRequest(VALID_BODY));
    const body = await res.json();

    // Assert
    expect(res.status).toBe(504);
    expect(body.code).toBe('timeout');
  });

  it('passes the resolved binPath to the CLI adapter', async () => {
    // Arrange
    const runViaCli = vi.fn().mockResolvedValue(EXAMPLE_RESPONSE);
    const app = withDeps({
      runViaCli,
      detection: {
        cli: { available: true, binPath: '/opt/openclaude/bin/openclaude', name: 'openclaude' },
        apiKey: false,
        recommended: 'cli',
      },
    });

    // Act
    await app.fetch(makeRequest(VALID_BODY));

    // Assert
    expect(runViaCli).toHaveBeenCalledWith(
      expect.objectContaining({
        binPath: '/opt/openclaude/bin/openclaude',
      }),
    );
  });

  it('threads systemPrompt + composed userMessage through to the adapter', async () => {
    // Arrange
    const runViaCli = vi.fn().mockResolvedValue(EXAMPLE_RESPONSE);
    const app = withDeps({ runViaCli });

    // Act
    await app.fetch(makeRequest(VALID_BODY));

    // Assert
    const call = runViaCli.mock.calls[0][0];
    expect(call.systemPrompt).toMatch(/Analisador de Momentos Virais/);
    expect(call.userMessage).toContain('<transcript>');
    expect(call.userMessage).toContain('Execute análise completa');
  });
});
