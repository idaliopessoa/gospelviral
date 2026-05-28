import { Hono } from 'hono';
import { Readable } from 'node:stream';
import {
  parseMultipartUpload,
  MultipartError,
} from '../lib/multipart-parser.js';
import { isValidVideoId } from '../lib/upload-validation.js';
import {
  EmptyFileError,
  UnsupportedMimeTypeError,
} from '../storage/video-storage.js';

/**
 * Build the Hono router for the upload endpoints.
 *
 * @param {Object} deps
 * @param {import('../storage/video-storage.js').createVideoStorage} deps.storage
 * @param {Set<string>} deps.allowedMimes
 * @param {number} deps.maxBytes
 * @returns {Hono}
 */
export function createUploadRouter({ storage, allowedMimes, maxBytes }) {
  const app = new Hono();

  app.post('/', async (c) => {
    const contentType = c.req.header('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return err(c, 'invalid_content_type', 'expected multipart/form-data');
    }

    const nodeStream = Readable.fromWeb(c.req.raw.body);
    let saved = null;
    let mimeViolation = null;
    let videoSeen = false;

    try {
      await parseMultipartUpload(nodeStream, {
        contentType,
        limits: { fileSize: maxBytes },
        onFile: async (file) => {
          if (file.fieldname !== 'video') {
            // Drain ignored fields so busboy can keep moving
            file.stream.resume();
            return;
          }
          videoSeen = true;
          if (!allowedMimes.has(file.mimeType)) {
            mimeViolation = file.mimeType;
            file.stream.resume();
            return;
          }
          saved = await storage.save({
            stream: file.stream,
            filename: file.filename,
            mimeType: file.mimeType,
          });
        },
      });
    } catch (e) {
      return mapMultipartError(c, e);
    }

    if (mimeViolation !== null) {
      return err(c, 'invalid_mime_type', `mime ${mimeViolation} is not allowed`);
    }
    if (!videoSeen) {
      return err(c, 'missing_video_field', '"video" field is required');
    }
    if (saved === null) {
      return err(c, 'missing_video_field', '"video" field is required');
    }
    return c.json({ videoSource: saved }, 200);
  });

  app.get('/:id/info', async (c) => {
    const id = c.req.param('id');
    if (!isValidVideoId(id)) {
      return err(c, 'invalid_id', 'id must be a v4 uuid');
    }
    const videoSource = await storage.get(id);
    if (!videoSource) {
      return c.json({ error: { code: 'not_found', message: 'unknown id' } }, 404);
    }
    return c.json({ videoSource }, 200);
  });

  return app;
}

function err(c, code, message) {
  return c.json({ error: { code, message } }, 400);
}

function mapMultipartError(c, e) {
  if (e instanceof MultipartError) {
    if (e.code === 'file_too_large') {
      return err(c, 'file_too_large', e.message);
    }
    return err(c, 'malformed_body', e.message);
  }
  if (e instanceof EmptyFileError) {
    return err(c, 'empty_file', e.message);
  }
  if (e instanceof UnsupportedMimeTypeError) {
    return err(c, 'invalid_mime_type', e.message);
  }
  throw e;
}
