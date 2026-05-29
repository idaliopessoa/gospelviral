import { describe, it, expect } from 'vitest';
import { app } from './server.js';

describe('scaffold: server', () => {
  it('healthz returns 200 with status + version envelope', async () => {
    // Arrange
    const req = new Request('http://localhost/healthz');

    // Act
    const res = await app.fetch(req);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
  });

  it('imports @gospelviral/shared cleanly', async () => {
    // Arrange + Act
    const shared = await import('@gospelviral/shared');

    // Assert
    expect(shared).toBeDefined();
  });

  it('mounts the upload router (POST without a video field → 400 missing_video_field)', async () => {
    // Arrange
    const form = new FormData();
    form.append('wrongfield', new Blob([Buffer.from('x')], { type: 'video/mp4' }), 'x.mp4');
    const req = new Request('http://localhost/api/upload/video', {
      method: 'POST',
      body: form,
    });

    // Act
    const res = await app.fetch(req);
    const body = await res.json();

    // Assert — the router IS mounted; validation kicks in
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('missing_video_field');
  });
});
