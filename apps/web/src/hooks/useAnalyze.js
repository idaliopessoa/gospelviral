import { useState } from 'react';
import { analyzeMoments } from '../lib/api.js';
import { extractVideoId } from '../lib/helpers.js';

const TIMESTAMP_RE = /\d{1,2}:\d{2}/;

function validateInput(url, transcript) {
  if (!extractVideoId(url)) return 'URL do YouTube inválida.';
  if (!transcript.trim()) return 'Cole a transcrição.';
  if (!TIMESTAMP_RE.test(transcript))
    return 'A transcrição precisa ter timestamps no formato MM:SS.';
  return null;
}

/**
 * Coordinates the three-view state machine for analysis.
 * - validates inputs synchronously
 * - flips to "analyzing" while the api call runs
 * - on success returns to "results"; on failure goes back to "input" with an error
 *
 * @param {(client: typeof analyzeMoments) => typeof analyzeMoments} [clientFactory]
 *   Override for tests. Defaults to the real placeholder client.
 */
export function useAnalyze(clientFactory = (c) => c) {
  const [view, setView] = useState('input');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const client = clientFactory(analyzeMoments);

  async function analyze({ url, transcript }) {
    setError(null);
    const validationError = validateInput(url, transcript);
    if (validationError) {
      setError(validationError);
      return;
    }
    setView('analyzing');
    try {
      const response = await client({ url, transcript });
      setResults(response);
      setView('results');
    } catch (e) {
      setError(`Falha na análise: ${e.message}`);
      setView('input');
    }
  }

  function showExample(response) {
    setResults(response);
    setView('results');
  }

  function reset() {
    setView('input');
    setResults(null);
    setError(null);
  }

  return { view, results, error, analyze, showExample, reset };
}
