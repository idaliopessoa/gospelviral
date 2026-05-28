import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, rename, unlink, readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

/**
 * Streaming video storage. Owns the on-disk layout (`<dir>/<uuid>.<ext>` +
 * sidecar `<dir>/<uuid>.json`) and the atomic-write discipline. NEVER
 * buffers the file in RAM — `save({ stream, ... })` pipes the input through
 * `pipeline()` into `fs.createWriteStream(...)` (memory residency is O(chunk)).
 */

const MIME_TO_EXT = new Map([
  ['video/mp4', 'mp4'],
  ['video/quicktime', 'mov'],
  ['video/webm', 'webm'],
]);

export class EmptyFileError extends Error {
  constructor() {
    super('uploaded file is empty (0 bytes)');
    this.name = 'EmptyFileError';
    this.code = 'empty_file';
  }
}

export class UnsupportedMimeTypeError extends Error {
  /** @param {string} mimeType */
  constructor(mimeType) {
    super(`unsupported mime type: ${mimeType}`);
    this.name = 'UnsupportedMimeTypeError';
    this.code = 'invalid_mime_type';
    this.mimeType = mimeType;
  }
}

function mimeToExt(mime) {
  const ext = MIME_TO_EXT.get(mime);
  if (!ext) throw new UnsupportedMimeTypeError(mime);
  return ext;
}

function paths(dir, id, ext) {
  return {
    tmp: join(dir, `${id}.tmp`),
    final: join(dir, `${id}.${ext}`),
    sidecarTmp: join(dir, `${id}.json.tmp`),
    sidecar: join(dir, `${id}.json`),
  };
}

async function safeUnlink(p) {
  try {
    await unlink(p);
  } catch {
    // best-effort cleanup
  }
}

/**
 * @param {string} dir
 * @returns {Promise<number>}  number of entries deleted
 */
async function clearDirContents(dir) {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  await Promise.all(entries.map((e) => safeUnlink(join(dir, e))));
  return entries.length;
}

async function readSidecar(p) {
  try {
    const raw = await readFile(p, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} StorageDeps
 * @property {string} dir       absolute path to the upload dir
 * @property {{ debug: Function, info: Function, warn: Function, error: Function }} logger
 */

/**
 * @typedef {Object} SaveInput
 * @property {import('node:stream').Readable} stream
 * @property {string} filename       original filename (display only; NEVER on disk)
 * @property {string} mimeType
 */

/**
 * @param {StorageDeps} deps
 */
export function createVideoStorage({ dir, logger }) {
  async function init() {
    const deleted = await clearDirContents(dir);
    logger.info('video-storage init', { dir, deleted });
  }

  async function writeBinary(stream, p) {
    let bytes = 0;
    const out = createWriteStream(p);
    out.on('data', () => {});
    await pipeline(stream, async function* (src) {
      for await (const chunk of src) {
        bytes += chunk.length;
        yield chunk;
      }
    }, out);
    return bytes;
  }

  async function save({ stream, filename, mimeType }) {
    const ext = mimeToExt(mimeType);
    const id = randomUUID();
    const p = paths(dir, id, ext);

    let bytes = 0;
    try {
      bytes = await writeBinary(stream, p.tmp);
      if (bytes === 0) {
        await safeUnlink(p.tmp);
        throw new EmptyFileError();
      }
      await rename(p.tmp, p.final);
    } catch (e) {
      await safeUnlink(p.tmp);
      await safeUnlink(p.final);
      throw e;
    }

    const videoSource = {
      id,
      filename,
      sizeBytes: bytes,
      mimeType,
      uploadedAt: new Date().toISOString(),
    };

    try {
      await writeFile(p.sidecarTmp, JSON.stringify(videoSource));
      await rename(p.sidecarTmp, p.sidecar);
    } catch (e) {
      await safeUnlink(p.sidecarTmp);
      await safeUnlink(p.sidecar);
      await safeUnlink(p.final);
      throw e;
    }

    return videoSource;
  }

  async function get(id) {
    return readSidecar(join(dir, `${id}.json`));
  }

  async function stream(id) {
    const meta = await get(id);
    if (!meta) return null;
    const ext = mimeToExt(meta.mimeType);
    return createReadStream(join(dir, `${id}.${ext}`));
  }

  return { init, save, get, stream };
}
