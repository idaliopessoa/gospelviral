import { useEffect, useRef } from 'react';
import { saveVisualPresets } from '../lib/persistence.js';

/**
 * Persist the current visual-presets snapshot to localStorage on every
 * change after mount. The first effect run is skipped so we don't write
 * the freshly-loaded snapshot back over itself.
 *
 * @param {import('../lib/persistence.js').VisualPresets} presets
 */
export function useVisualPresetsPersistence(presets) {
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveVisualPresets(presets);
  }, [presets]);
}
