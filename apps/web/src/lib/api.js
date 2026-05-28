import {
  EXAMPLE_RESPONSE,
  EXAMPLE_TRANSCRIPT,
  EXAMPLE_URL,
} from '@gospelviral/shared';

/**
 * Call `POST /api/analyze` on the backend. Same surface that the placeholder
 * exposed in TASK_004 — the swap is implementation-only.
 *
 * @param {{
 *   url: string,
 *   transcript: string,
 *   mode?: 'auto'|'cli'|'api',
 *   model?: 'default'|'fast'|'debug',
 * }} request
 * @param {{ signal?: AbortSignal, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<import('@gospelviral/shared').AnalysisResponse>}
 */
export async function analyzeMoments(request, opts = {}) {
  const { url, transcript, mode, model } = request;
  const fetchImpl = opts.fetchImpl ?? fetch;

  // The example button bypasses the backend so the demo path remains
  // self-contained.
  if (url === EXAMPLE_URL && transcript === EXAMPLE_TRANSCRIPT) {
    await delay(800, opts.signal);
    return EXAMPLE_RESPONSE;
  }

  const body = { url, transcript };
  if (mode && mode !== 'auto') body.mode = mode;
  if (model && model !== 'default') body.model = model;

  let res;
  try {
    res = await fetchImpl('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new AnalyzeClientError(
      'network',
      'Servidor backend inacessível — verifique se está rodando.',
    );
  }

  const envelope = await safeReadJson(res);
  if (!res.ok || envelope?.status !== 'ok') {
    throw new AnalyzeClientError(
      envelope?.code ?? `http_${res.status}`,
      envelope?.message ?? `Resposta inesperada do servidor (HTTP ${res.status}).`,
    );
  }
  return envelope.data;
}

async function safeReadJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      const e = new Error('Aborted');
      e.name = 'AbortError';
      reject(e);
    });
  });
}

export class AnalyzeClientError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AnalyzeClientError';
    this.code = code;
  }
}
