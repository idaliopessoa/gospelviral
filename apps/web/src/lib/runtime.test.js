import { describe, it, expect, vi } from 'vitest';
import { fetchRuntime } from './runtime.js';

function ok(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'ok', data }),
  });
}

function fail(status, body) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body ?? {}),
  });
}

describe('fetchRuntime', () => {
  it('returns the runtime status on a 200 envelope', async () => {
    // Arrange
    const data = {
      cli: { available: true, binPath: '/usr/local/bin/claude', name: 'claude' },
      apiKey: true,
      recommended: 'cli',
    };
    const fetchImpl = vi.fn().mockReturnValue(ok(data));

    // Act
    const out = await fetchRuntime({ fetchImpl });

    // Assert
    expect(out).toEqual(data);
    expect(fetchImpl).toHaveBeenCalledWith('/api/runtime/detect', expect.any(Object));
  });

  it('hits ?refresh=true when refresh option is set', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(
      ok({ cli: { available: false }, apiKey: false, recommended: 'none' }),
    );

    // Act
    await fetchRuntime({ refresh: true, fetchImpl });

    // Assert
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/runtime/detect?refresh=true');
  });

  it('throws PT-BR network error when fetch rejects', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    // Act + Assert
    await expect(fetchRuntime({ fetchImpl })).rejects.toThrow(/Servidor backend inacessível/);
  });

  it('re-throws AbortError unchanged', async () => {
    // Arrange
    const aerr = new Error('Aborted');
    aerr.name = 'AbortError';
    const fetchImpl = vi.fn().mockRejectedValue(aerr);

    // Act + Assert
    await expect(fetchRuntime({ fetchImpl })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('throws on non-ok HTTP status', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockReturnValue(fail(500));

    // Act + Assert
    await expect(fetchRuntime({ fetchImpl })).rejects.toThrow(/HTTP 500/);
  });
});
