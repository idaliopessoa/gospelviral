import { useCallback, useEffect, useState } from 'react';
import { fetchRuntime as defaultFetchRuntime } from '../lib/runtime.js';

/**
 * Track the server's runtime detection result + the user's session-only
 * forced mode override.
 *
 * @param {{ fetchImpl?: typeof defaultFetchRuntime }} [opts]
 * @returns {{
 *   status: import('../lib/runtime.js').RuntimeStatus | null,
 *   error: Error | null,
 *   loading: boolean,
 *   forcedMode: 'auto'|'cli'|'api',
 *   currentMode: 'auto'|'cli'|'api'|'none',
 *   setForcedMode: (mode: 'auto'|'cli'|'api') => void,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useRuntime({ fetchImpl = defaultFetchRuntime } = {}) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forcedMode, setForcedMode] = useState('auto');

  const load = useCallback(
    async (refresh) => {
      setLoading(true);
      try {
        const next = await fetchImpl({ refresh });
        setStatus(next);
        setError(null);
      } catch (e) {
        if (e?.name !== 'AbortError') setError(e);
      } finally {
        setLoading(false);
      }
    },
    [fetchImpl],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const currentMode =
    forcedMode === 'auto' ? (status?.recommended ?? 'none') : forcedMode;

  return { status, error, loading, forcedMode, currentMode, setForcedMode, refresh };
}
