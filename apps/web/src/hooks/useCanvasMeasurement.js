import { useEffect, useRef, useState } from 'react';
import { CANVAS_REFERENCE } from '@gospelviral/shared';

const DEFAULT_INITIAL_SIZE = Object.freeze({ width: 200, height: 356 });

/**
 * Measure a DOM element on mount + window resize and expose a scaleFactor
 * mapping the rendered preview width back to the 1080-px canvas reference.
 *
 * Returns:
 *   - canvasRef: pass to the element via `ref={canvasRef}`
 *   - canvasSize: { width, height } in DOM pixels (defaults to a sensible
 *     pre-mount value so SSR / jsdom snapshots are deterministic)
 *   - scaleFactor: canvasSize.width / 1080
 */
export function useCanvasMeasurement(initialSize = DEFAULT_INITIAL_SIZE) {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(initialSize);

  useEffect(() => {
    function measure() {
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setCanvasSize({ width: rect.width, height: rect.height });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scaleFactor = canvasSize.width / CANVAS_REFERENCE.width;

  return { canvasRef, canvasSize, scaleFactor };
}
