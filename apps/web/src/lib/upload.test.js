import { describe, it, expect, vi } from 'vitest';
import { uploadVideo, UploadError } from './upload.js';

/**
 * Minimal fake XMLHttpRequest. Tests drive it via the `_progress` / `_load`
 * / `_netError` helpers after kicking off uploadVideo.
 */
class FakeXHR {
  constructor() {
    this.upload = {};
    this.status = 0;
    this.responseText = '';
    this.method = null;
    this.url = null;
    this.body = null;
    this.sent = false;
    this.aborted = false;
    FakeXHR.last = this;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(body) {
    this.body = body;
    this.sent = true;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  // --- test drivers ---
  _progress(loaded, total, lengthComputable = true) {
    this.upload.onprogress?.({ lengthComputable, loaded, total });
  }

  _load(status, responseText) {
    this.status = status;
    this.responseText = responseText;
    this.onload?.();
  }

  _netError() {
    this.onerror?.();
  }
}

const VIDEO_SOURCE = {
  id: '11111111-1111-1111-1111-111111111111',
  filename: 'sample.mp4',
  sizeBytes: 1234,
  mimeType: 'video/mp4',
  uploadedAt: '2026-05-29T00:00:00.000Z',
};

function makeFile() {
  return new File([new Blob(['bytes'])], 'sample.mp4', { type: 'video/mp4' });
}

describe('uploadVideo', () => {
  it('resolves with videoSource on a 200 load', async () => {
    // Arrange
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR });

    // Act
    FakeXHR.last._load(200, JSON.stringify({ videoSource: VIDEO_SOURCE }));

    // Assert
    await expect(promise).resolves.toEqual(VIDEO_SOURCE);
  });

  it('rejects UploadError invalid_mime_type on a 400 with that code', async () => {
    // Arrange
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR });

    // Act
    FakeXHR.last._load(400, JSON.stringify({ error: { code: 'invalid_mime_type' } }));

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: 'UploadError',
      code: 'invalid_mime_type',
    });
  });

  it('rejects UploadError file_too_large on a 400 with that code', async () => {
    // Arrange
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR });

    // Act
    FakeXHR.last._load(400, JSON.stringify({ error: { code: 'file_too_large' } }));

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: 'UploadError',
      code: 'file_too_large',
    });
  });

  it('rejects UploadError network on an XHR error event', async () => {
    // Arrange
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR });

    // Act
    FakeXHR.last._netError();

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: 'UploadError',
      code: 'network',
    });
  });

  it('rejects UploadError unknown on a 500 with no usable body', async () => {
    // Arrange
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR });

    // Act
    FakeXHR.last._load(500, 'not json');

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: 'UploadError',
      code: 'unknown',
    });
  });

  it('sends a FormData with field "video" carrying the original file', async () => {
    // Arrange
    const file = makeFile();

    // Act
    const promise = uploadVideo(file, { xhrImpl: FakeXHR });
    const sent = FakeXHR.last.body;
    FakeXHR.last._load(200, JSON.stringify({ videoSource: VIDEO_SOURCE }));
    await promise;

    // Assert
    expect(sent).toBeInstanceOf(FormData);
    expect(sent.get('video')).toBe(file);
    expect(FakeXHR.last.method).toBe('POST');
    expect(FakeXHR.last.url).toBe('/api/upload/video');
  });

  it('reports progress fractions via onProgress', async () => {
    // Arrange
    const onProgress = vi.fn();
    const promise = uploadVideo(makeFile(), { xhrImpl: FakeXHR, onProgress });

    // Act
    FakeXHR.last._progress(50, 100);
    FakeXHR.last._progress(100, 100);
    FakeXHR.last._load(200, JSON.stringify({ videoSource: VIDEO_SOURCE }));
    await promise;

    // Assert
    expect(onProgress).toHaveBeenNthCalledWith(1, 0.5);
    expect(onProgress).toHaveBeenNthCalledWith(2, 1);
  });

  it('rejects immediately with AbortError when the signal is already aborted (never sends)', async () => {
    // Arrange
    const controller = new AbortController();
    controller.abort();

    // Act
    const promise = uploadVideo(makeFile(), {
      xhrImpl: FakeXHR,
      signal: controller.signal,
    });
    const xhr = FakeXHR.last;

    // Assert — AbortError, not wrapped, and no request went out
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(xhr.sent).toBe(false);
  });

  it('aborts mid-flight and rejects with a bare AbortError (not wrapped as UploadError)', async () => {
    // Arrange
    const controller = new AbortController();
    const promise = uploadVideo(makeFile(), {
      xhrImpl: FakeXHR,
      signal: controller.signal,
    });
    const xhr = FakeXHR.last;
    expect(xhr.sent).toBe(true);

    // Act — abort after send
    controller.abort();

    // Assert
    expect(xhr.aborted).toBe(true);
    const err = await promise.catch((e) => e);
    expect(err.name).toBe('AbortError');
    expect(err).not.toBeInstanceOf(UploadError);
  });
});
