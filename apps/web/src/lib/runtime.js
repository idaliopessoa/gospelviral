/**
 * @typedef {Object} RuntimeStatus
 * @property {{ available: boolean, binPath?: string, name?: string }} cli
 * @property {boolean} apiKey
 * @property {'cli'|'api'|'none'} recommended
 */

/**
 * Fetch the server's runtime detection status.
 *
 * @param {{ refresh?: boolean, fetchImpl?: typeof fetch, signal?: AbortSignal }} [opts]
 * @returns {Promise<RuntimeStatus>}
 */
export async function fetchRuntime({
  refresh = false,
  fetchImpl = fetch,
  signal,
} = {}) {
  const url = refresh ? '/api/runtime/detect?refresh=true' : '/api/runtime/detect';
  let res;
  try {
    res = await fetchImpl(url, { signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Servidor backend inacessível — verifique se está rodando.');
  }
  if (!res.ok) {
    throw new Error(`Falha em /api/runtime/detect (HTTP ${res.status}).`);
  }
  const envelope = await res.json();
  if (envelope.status !== 'ok') {
    throw new Error(envelope.message ?? 'Resposta inesperada do servidor.');
  }
  return envelope.data;
}
