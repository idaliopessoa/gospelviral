import {
  EXAMPLE_RESPONSE,
  EXAMPLE_TRANSCRIPT,
  EXAMPLE_URL,
} from '@gospelviral/shared';

/**
 * Placeholder transport. TASK_010 swaps the body of this function for the
 * real `fetch('/api/analyze', …)` call; the signature is the contract.
 *
 * - Returns `EXAMPLE_RESPONSE` after a 1.2 s delay when input matches the
 *   example fixture (URL + transcript). Same envelope shape the server will
 *   eventually return.
 * - Throws `Error("backend not wired yet — TASK_010")` for any other input.
 *
 * @param {import('@gospelviral/shared').AnalysisRequest} request
 * @returns {Promise<import('@gospelviral/shared').AnalysisResponse>}
 */
export async function analyzeMoments({ url, transcript, signal }) {
  if (url === EXAMPLE_URL && transcript === EXAMPLE_TRANSCRIPT) {
    await delay(1200, signal);
    return EXAMPLE_RESPONSE;
  }
  throw new Error('backend not wired yet — TASK_010');
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
