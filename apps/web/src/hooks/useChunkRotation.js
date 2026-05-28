import { useEffect, useState } from 'react';

/**
 * Cycle through `chunks` on a fixed interval (default 2200 ms).
 * Resets to 0 whenever the chunk list reference changes.
 *
 * @param {string[]} chunks
 * @param {number} [intervalMs=2200]
 * @returns {number} current chunk index
 */
export function useChunkRotation(chunks, intervalMs = 2200) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (chunks.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % chunks.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [chunks, intervalMs]);

  return index;
}
