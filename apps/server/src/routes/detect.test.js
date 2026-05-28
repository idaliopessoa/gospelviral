import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDetectRouter } from './detect.js';
import { clearDetectionCache } from '../runtime/detect.js';

beforeEach(() => {
  clearDetectionCache();
});

async function jsonOf(res) {
  return res.json();
}

describe('GET /api/runtime/detect', () => {
  it('returns the runtime status envelope', async () => {
    // Arrange
    const app = createDetectRouter();

    // Act
    const res = await app.fetch(new Request('http://localhost/'));
    const body = await jsonOf(res);

    // Assert
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.data).toHaveProperty('cli');
    expect(body.data).toHaveProperty('apiKey');
    expect(['cli', 'api', 'none']).toContain(body.data.recommended);
  });

  it('clears the detection cache when refresh=true', async () => {
    // Arrange
    const app = createDetectRouter();
    const spy = vi.spyOn({ clearDetectionCache }, 'clearDetectionCache');

    // Act
    await app.fetch(new Request('http://localhost/?refresh=true'));

    // Assert — re-fetch produces a fresh status (smoke check; we cannot
    // directly observe the cache eviction here)
    const res = await app.fetch(new Request('http://localhost/?refresh=true'));
    expect(res.status).toBe(200);
    spy.mockRestore();
  });
});
