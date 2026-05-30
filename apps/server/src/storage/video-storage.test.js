import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { createVideoStorage, EmptyFileError } from './video-storage.js';

const silentLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function freshDirPath() {
  return join(tmpdir(), `video-storage-test-${randomUUID()}`);
}

function streamFrom(bytes) {
  return Readable.from([Buffer.from(bytes)]);
}

describe('createVideoStorage', () => {
  let dir;
  let storage;

  beforeEach(() => {
    dir = freshDirPath();
    storage = createVideoStorage({ dir, logger: silentLogger });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('init() on a fresh dir creates it and exits cleanly', async () => {
    // Arrange + Act
    await storage.init();

    // Assert
    const entries = await readdir(dir);
    expect(entries).toEqual([]);
  });

  it('init() deletes stale files but preserves the dir', async () => {
    // Arrange
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'stale-1.mp4'), 'old');
    await writeFile(join(dir, 'stale-2.json'), '{}');

    // Act
    await storage.init();

    // Assert
    const entries = await readdir(dir);
    expect(entries).toEqual([]);
  });

  it('init() is idempotent (two calls in a row)', async () => {
    // Arrange + Act
    await storage.init();
    await storage.init();

    // Assert — still empty, no throw
    const entries = await readdir(dir);
    expect(entries).toEqual([]);
  });

  it('save() writes bytes, returns a typed VideoSource, writes sidecar JSON', async () => {
    // Arrange
    await storage.init();
    const payload = 'hello world bytes';

    // Act
    const videoSource = await storage.save({
      stream: streamFrom(payload),
      filename: 'sample.mp4',
      mimeType: 'video/mp4',
    });

    // Assert — shape
    expect(videoSource).toMatchObject({
      filename: 'sample.mp4',
      sizeBytes: payload.length,
      mimeType: 'video/mp4',
    });
    expect(typeof videoSource.id).toBe('string');
    expect(videoSource.id).toHaveLength(36);
    expect(typeof videoSource.uploadedAt).toBe('string');

    // Assert — on disk
    const binaryPath = join(dir, `${videoSource.id}.mp4`);
    const sidecarPath = join(dir, `${videoSource.id}.json`);
    const written = await readFile(binaryPath, 'utf-8');
    const sidecar = JSON.parse(await readFile(sidecarPath, 'utf-8'));
    expect(written).toBe(payload);
    expect(sidecar).toEqual(videoSource);
  });

  it('save() rejects with EmptyFileError when the stream yields zero bytes', async () => {
    // Arrange
    await storage.init();

    // Act + Assert
    await expect(
      storage.save({
        stream: Readable.from([]),
        filename: 'empty.mp4',
        mimeType: 'video/mp4',
      }),
    ).rejects.toBeInstanceOf(EmptyFileError);
  });

  it('get() returns the saved VideoSource for a known id (reads sidecar)', async () => {
    // Arrange
    await storage.init();
    const original = await storage.save({
      stream: streamFrom('payload'),
      filename: 'a.mp4',
      mimeType: 'video/mp4',
    });

    // Act
    const reloaded = await storage.get(original.id);

    // Assert
    expect(reloaded).toEqual(original);
  });

  it('get() returns null for an unknown id', async () => {
    // Arrange
    await storage.init();

    // Act + Assert
    expect(await storage.get('11111111-1111-1111-1111-111111111111')).toBeNull();
  });

  it('stream() returns a Readable whose bytes equal the original', async () => {
    // Arrange
    await storage.init();
    const payload = 'streaming-bytes';
    const { id } = await storage.save({
      stream: streamFrom(payload),
      filename: 'b.mp4',
      mimeType: 'video/mp4',
    });

    // Act
    const r = await storage.stream(id);
    const chunks = [];
    for await (const chunk of r) chunks.push(chunk);

    // Assert
    expect(Buffer.concat(chunks).toString('utf-8')).toBe(payload);
  });

  it('stream() returns null for an unknown id', async () => {
    // Arrange
    await storage.init();

    // Act + Assert
    expect(await storage.stream('22222222-2222-2222-2222-222222222222')).toBeNull();
  });

  it('atomic write: a stream that errors mid-pipeline leaves no final-named files visible', async () => {
    // Arrange — a stream that emits one chunk then explodes
    await storage.init();
    const exploding = new Readable({
      read() {
        this.push(Buffer.from('partial'));
        this.destroy(new Error('synthesized pipe error'));
      },
    });

    // Act
    await expect(
      storage.save({
        stream: exploding,
        filename: 'crash.mp4',
        mimeType: 'video/mp4',
      }),
    ).rejects.toThrow(/synthesized pipe error/);

    // Assert — no <id>.mp4 (final) and no <id>.json (sidecar) visible.
    // Atomic write rule: the failure window MUST NOT publish either file
    // under its final name. .tmp residue is acceptable and cleaned on
    // next server boot by init()
    const entries = await readdir(dir);
    expect(entries.filter((e) => e.endsWith('.mp4'))).toEqual([]);
    expect(entries.filter((e) => e.endsWith('.json'))).toEqual([]);
  });

  it('save() rejects unsupported mime types loudly (UnsupportedMimeTypeError)', async () => {
    // Arrange
    await storage.init();
    const { UnsupportedMimeTypeError } = await import('./video-storage.js');

    // Act + Assert — application/pdf is not in the mime→ext map
    await expect(
      storage.save({
        stream: streamFrom('x'),
        filename: 'wrong.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(UnsupportedMimeTypeError);
  });

  it('streamRange() with no range returns the full file + size + mimeType', async () => {
    // Arrange
    await storage.init();
    const payload = 'abcdefghij'; // 10 bytes
    const { id } = await storage.save({
      stream: streamFrom(payload),
      filename: 'r.mp4',
      mimeType: 'video/mp4',
    });

    // Act
    const out = await storage.streamRange(id);
    const chunks = [];
    for await (const chunk of out.stream) chunks.push(chunk);

    // Assert
    expect(Buffer.concat(chunks).toString('utf-8')).toBe(payload);
    expect(out.size).toBe(10);
    expect(out.mimeType).toBe('video/mp4');
  });

  it('streamRange() with a byte range returns exactly that inclusive slice', async () => {
    // Arrange
    await storage.init();
    const payload = 'abcdefghij'; // bytes 0..9
    const { id } = await storage.save({
      stream: streamFrom(payload),
      filename: 's.mp4',
      mimeType: 'video/mp4',
    });

    // Act — bytes [2,5] inclusive → "cdef"
    const out = await storage.streamRange(id, { start: 2, end: 5 });
    const chunks = [];
    for await (const chunk of out.stream) chunks.push(chunk);

    // Assert
    expect(Buffer.concat(chunks).toString('utf-8')).toBe('cdef');
    expect(out.size).toBe(10);
  });

  it('streamRange() returns null for an unknown id', async () => {
    // Arrange
    await storage.init();

    // Act + Assert
    expect(
      await storage.streamRange('33333333-3333-3333-3333-333333333333'),
    ).toBeNull();
  });

  it('streamRange() reads lazily (a 1 MB file does not balloon resident memory)', async () => {
    // Arrange — write 1 MB, then read a tiny range; assert the returned
    // stream is a fs ReadStream (createReadStream), not a buffered blob
    await storage.init();
    const big = Buffer.alloc(1024 * 1024, 7);
    const { id } = await storage.save({
      stream: Readable.from([big]),
      filename: 'big.mp4',
      mimeType: 'video/mp4',
    });

    // Act
    const out = await storage.streamRange(id, { start: 0, end: 3 });

    // Assert — node fs ReadStream exposes a `path` + `bytesRead`, a buffered
    // Readable.from would not. Drain the 4 bytes.
    expect(out.stream).toHaveProperty('path');
    const chunks = [];
    for await (const chunk of out.stream) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toHaveLength(4);
  });
});
