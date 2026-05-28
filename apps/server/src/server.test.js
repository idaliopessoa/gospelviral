import { describe, it, expect } from 'vitest';
import { app } from './server.js';

describe('scaffold: server', () => {
  it('healthz returns 200 ok', async () => {
    // Arrange
    const req = new Request('http://localhost/healthz');

    // Act
    const res = await app.fetch(req);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it('imports @gospelviral/shared cleanly', async () => {
    // Arrange + Act
    const shared = await import('@gospelviral/shared');

    // Assert
    expect(shared).toBeDefined();
  });
});
