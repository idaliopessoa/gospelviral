import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { parseMultipartUpload } from './multipart-parser.js';

/**
 * Build a multipart-encoded Node Readable from a FormData payload using
 * Node 20's native Request → ReadableStream conversion. Returns
 * `{ stream, contentType }` so the test can drive the parser directly.
 */
function buildMultipart(formData) {
  const response = new Response(formData);
  const contentType = response.headers.get('content-type');
  const stream = Readable.fromWeb(response.body);
  return { stream, contentType };
}

async function consumeFile(file) {
  const chunks = [];
  for await (const chunk of file.stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

describe('parseMultipartUpload', () => {
  it('single-file body invokes onFile once with stream + filename + mimeType + fieldname', async () => {
    // Arrange
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.from('hello world')], { type: 'video/mp4' }),
      'sample.mp4',
    );
    const { stream, contentType } = buildMultipart(form);
    const calls = [];

    // Act
    await parseMultipartUpload(stream, {
      contentType,
      onFile: async (file) => {
        const bytes = await consumeFile(file);
        calls.push({
          filename: file.filename,
          mimeType: file.mimeType,
          fieldname: file.fieldname,
          bytes,
        });
      },
    });

    // Assert
    expect(calls).toHaveLength(1);
    expect(calls[0].filename).toBe('sample.mp4');
    expect(calls[0].mimeType).toBe('video/mp4');
    expect(calls[0].fieldname).toBe('video');
    expect(calls[0].bytes.toString()).toBe('hello world');
  });

  it('multi-file body invokes onFile per file in field order', async () => {
    // Arrange
    const form = new FormData();
    form.append('first', new Blob([Buffer.from('aaa')], { type: 'video/mp4' }), 'a.mp4');
    form.append('second', new Blob([Buffer.from('bb')], { type: 'video/webm' }), 'b.webm');
    const { stream, contentType } = buildMultipart(form);
    const calls = [];

    // Act
    await parseMultipartUpload(stream, {
      contentType,
      onFile: async (file) => {
        const bytes = await consumeFile(file);
        calls.push({ fieldname: file.fieldname, bytes: bytes.toString() });
      },
    });

    // Assert
    expect(calls).toEqual([
      { fieldname: 'first', bytes: 'aaa' },
      { fieldname: 'second', bytes: 'bb' },
    ]);
  });

  it('rejects with MultipartError { code: "file_too_large" } when a file exceeds limits.fileSize', async () => {
    // Arrange
    const form = new FormData();
    form.append(
      'video',
      new Blob([Buffer.alloc(2048, 'x')], { type: 'video/mp4' }),
      'big.mp4',
    );
    const { stream, contentType } = buildMultipart(form);

    // Act + Assert
    await expect(
      parseMultipartUpload(stream, {
        contentType,
        limits: { fileSize: 1024 },
        onFile: async (file) => {
          // Drain so busboy sees the limit
          for await (const _ of file.stream) {
            // noop
          }
        },
      }),
    ).rejects.toMatchObject({
      name: 'MultipartError',
      code: 'file_too_large',
    });
  });

  it('rejects with MultipartError { code: "malformed_body" } when the multipart body is invalid', async () => {
    // Arrange
    const stream = Readable.from(['not a valid multipart body at all']);

    // Act + Assert
    await expect(
      parseMultipartUpload(stream, {
        contentType: 'multipart/form-data; boundary=----X',
        onFile: vi.fn(),
      }),
    ).rejects.toMatchObject({
      name: 'MultipartError',
      code: 'malformed_body',
    });
  });

  it('empty multipart body resolves without invoking onFile', async () => {
    // Arrange — an empty FormData still produces a valid multipart envelope
    const form = new FormData();
    const { stream, contentType } = buildMultipart(form);
    const onFile = vi.fn();

    // Act
    await parseMultipartUpload(stream, { contentType, onFile });

    // Assert
    expect(onFile).not.toHaveBeenCalled();
  });
});
