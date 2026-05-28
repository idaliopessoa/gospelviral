import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { createUploadRouter } from './upload.js';
import { createVideoStorage } from '../storage/video-storage.js';

const silentLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const ALLOWED_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const TEST_MAX_BYTES = 1024;

function freshDir() {
  return join(tmpdir(), `upload-route-test-${randomUUID()}`);
}

function buildApp({ storage, allowedMimes = ALLOWED_MIMES, maxBytes = TEST_MAX_BYTES }) {
  const app = new Hono();
  app.route(
    '/api/upload/video',
    createUploadRouter({ storage, allowedMimes, maxBytes }),
  );
  return app;
}

async function postMultipart(app, form) {
  return app.fetch(
    new Request('http://localhost/api/upload/video', {
      method: 'POST',
      body: form,
    }),
  );
}

describe('upload route', () => {
  let dir;
  let storage;
  let app;

  beforeEach(async () => {
    dir = freshDir();
    storage = createVideoStorage({ dir, logger: silentLogger });
    await storage.init();
    app = buildApp({ storage });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('POST /api/upload/video with a valid video/mp4 returns 200 + VideoSource', async () => {
    // Arrange
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.from('hello mp4')], { type: 'video/mp4' }),
      'sample.mp4',
    );

    // Act
    const res = await postMultipart(app, form);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.videoSource).toMatchObject({
      filename: 'sample.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 'hello mp4'.length,
    });
    expect(typeof body.videoSource.id).toBe('string');
    expect(body.videoSource.id).toHaveLength(36);
  });

  it('POST with application/pdf returns 400 invalid_mime_type', async () => {
    // Arrange
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.from('not a video')], { type: 'application/pdf' }),
      'doc.pdf',
    );

    // Act
    const res = await postMultipart(app, form);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('invalid_mime_type');
  });

  it('POST with a file larger than maxBytes returns 400 file_too_large', async () => {
    // Arrange — DI cap is 1024; send 2048 bytes
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.alloc(2048, 'x')], { type: 'video/mp4' }),
      'big.mp4',
    );

    // Act
    const res = await postMultipart(app, form);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('file_too_large');
  });

  it('POST with no "video" field returns 400 missing_video_field', async () => {
    // Arrange — wrong field name
    const form = new FormData();
    form.append(
      'wrongfield',
      new Blob([Buffer.from('x')], { type: 'video/mp4' }),
      'x.mp4',
    );

    // Act
    const res = await postMultipart(app, form);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('missing_video_field');
  });

  it('GET /api/upload/video/:id/info for a known id returns 200 + VideoSource', async () => {
    // Arrange
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.from('hi')], { type: 'video/mp4' }),
      'k.mp4',
    );
    const created = await (await postMultipart(app, form)).json();
    const id = created.videoSource.id;

    // Act
    const res = await app.fetch(
      new Request(`http://localhost/api/upload/video/${id}/info`),
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.videoSource).toEqual(created.videoSource);
  });

  it('GET /info for an unknown id returns 404', async () => {
    // Arrange
    const unknownId = '11111111-1111-1111-1111-111111111111';

    // Act
    const res = await app.fetch(
      new Request(`http://localhost/api/upload/video/${unknownId}/info`),
    );

    // Assert
    expect(res.status).toBe(404);
  });

  it('GET /info for an invalid id format returns 400 invalid_id', async () => {
    // Arrange
    const traversal = '..%2F..%2Fetc%2Fpasswd';

    // Act
    const res = await app.fetch(
      new Request(`http://localhost/api/upload/video/${traversal}/info`),
    );
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('invalid_id');
  });
});
