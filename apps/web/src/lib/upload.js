/**
 * Video upload transport. The ONLY module in apps/web that talks to
 * `POST /api/upload/video`.
 *
 * Uses XMLHttpRequest (NOT fetch) on purpose: `fetch` cannot report upload
 * progress, and a 2 GB upload runs for minutes — the UI needs a real
 * `0..1` fraction to avoid reading as frozen.
 *
 * The backend upload envelope is its own contract, distinct from
 * `/api/analyze`: success is `{ videoSource }`, failure is
 * `{ error: { code, message } }`. This client reads that shape directly.
 */

export class UploadError extends Error {
  /**
   * @param {'invalid_mime_type'|'file_too_large'|'network'|'unknown'} code
   * @param {string} message  technical/diagnostic — UI copy is composed in the component
   */
  constructor(code, message) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

// Only the two codes the UI acts on map through; everything else is "unknown".
const CODE_MAP = new Map([
  ['invalid_mime_type', 'invalid_mime_type'],
  ['file_too_large', 'file_too_large'],
]);

function makeAbortError() {
  const e = new Error('Upload aborted');
  e.name = 'AbortError';
  return e;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function settleFromXhr(xhr, resolve, reject) {
  const body = safeParse(xhr.responseText);
  if (xhr.status === 200 && body?.videoSource) {
    resolve(body.videoSource);
    return;
  }
  const mapped = CODE_MAP.get(body?.error?.code) ?? 'unknown';
  reject(new UploadError(mapped, body?.error?.message ?? `HTTP ${xhr.status}`));
}

/**
 * Upload a video file to the backend.
 *
 * @param {File} file
 * @param {{
 *   onProgress?: (fraction: number) => void,
 *   signal?: AbortSignal,
 *   xhrImpl?: typeof XMLHttpRequest,
 * }} [opts]
 * @returns {Promise<import('@gospelviral/shared').VideoSource>}
 * @throws {UploadError} on transport/server failure; AbortError passes through unwrapped
 */
export function uploadVideo(file, opts = {}) {
  const { onProgress, signal, xhrImpl = XMLHttpRequest } = opts;

  return new Promise((resolve, reject) => {
    const xhr = new xhrImpl();

    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }

    const form = new FormData();
    form.append('video', file);

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => settleFromXhr(xhr, resolve, reject);
    xhr.onerror = () => reject(new UploadError('network', 'XHR transport error'));
    xhr.onabort = () => reject(makeAbortError());

    xhr.open('POST', '/api/upload/video');
    xhr.send(form);
  });
}
