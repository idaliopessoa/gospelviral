import Busboy from 'busboy';

/**
 * Streaming multipart wrapper around `busboy`. Route handlers MUST NOT
 * import busboy directly — only via this module (per arch doc
 * "Wrap external dependencies"). Swap the underlying parser by changing
 * this file alone.
 */

export class MultipartError extends Error {
  /**
   * @param {'file_too_large'|'malformed_body'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'MultipartError';
    this.code = code;
  }
}

/**
 * @typedef {Object} MultipartFile
 * @property {import('node:stream').Readable} stream    file bytes — drain me
 * @property {string} filename                          original filename from the client
 * @property {string} mimeType                          original Content-Type from the client
 * @property {string} fieldname                         form field name
 */

/**
 * @typedef {Object} MultipartLimits
 * @property {number} [fileSize]  max bytes per file; busboy aborts the file stream when exceeded
 */

/**
 * Parse a multipart/form-data request body in a streaming manner.
 *
 * @param {import('node:stream').Readable} stream   request body as a Node Readable
 * @param {{ contentType: string, limits?: MultipartLimits, onFile: (f: MultipartFile) => Promise<void> }} options
 * @returns {Promise<void>}  resolves when the body is fully parsed and every
 *                           onFile callback has settled; rejects on
 *                           parser error or file_too_large
 */
export function parseMultipartUpload(stream, { contentType, limits, onFile }) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: { 'content-type': contentType }, limits });
    } catch (e) {
      reject(new MultipartError('malformed_body', `busboy init failed: ${e.message}`));
      return;
    }

    const pending = [];
    let aborted = false;

    function abort(err) {
      if (aborted) return;
      aborted = true;
      stream.unpipe(bb);
      reject(err);
    }

    bb.on('file', (fieldname, fileStream, info) => {
      fileStream.on('limit', () => {
        abort(new MultipartError('file_too_large', `file ${fieldname} exceeded fileSize limit`));
      });

      const task = Promise.resolve()
        .then(() =>
          onFile({
            stream: fileStream,
            filename: info.filename,
            mimeType: info.mimeType,
            fieldname,
          }),
        )
        .catch((e) => abort(e));
      pending.push(task);
    });

    bb.on('error', (e) => {
      abort(new MultipartError('malformed_body', e.message));
    });

    bb.on('close', () => {
      if (aborted) return;
      Promise.all(pending).then(() => resolve()).catch(reject);
    });

    stream.on('error', (e) => abort(new MultipartError('malformed_body', e.message)));
    stream.pipe(bb);
  });
}
