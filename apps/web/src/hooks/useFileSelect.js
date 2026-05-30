import { useCallback, useRef, useState } from 'react';

/**
 * Single source of truth for "pick a file via click OR drag-n-drop" (TASK_021).
 *
 * Click reliability: instead of a `<label>` wrapping a `display:none` input
 * (whose click can fall through to text selection and never open the OS
 * picker), the zone calls `open()` = `inputRef.current.click()` — a programmatic
 * click inside the user gesture, which always opens the native dialog.
 *
 * Drag reliability: every drag handler calls `preventDefault()` so the browser
 * never navigates to the dropped file; `onDrop` forwards the file the same way
 * a pick does. `isDragging` drives a hover-like highlight.
 *
 * Re-selecting the SAME file fires again: the input `value` is reset after each
 * pick (a file input does not emit `change` when re-chosen otherwise).
 *
 * The caller owns the visual: spread `zoneProps` on the clickable/drop surface
 * and `inputProps` on a (visually hidden) `<input>`. `onFile(file)` runs once
 * per selection from either path.
 *
 * @param {{ accept?: string, onFile: (file: File) => void }} opts
 * @returns {{
 *   isDragging: boolean,
 *   open: () => void,
 *   inputProps: { ref: import('react').RefObject<HTMLInputElement>, type: 'file', accept: string|undefined, onChange: (e: any) => void },
 *   zoneProps: { onClick: () => void, onDragOver: (e: any) => void, onDragLeave: (e: any) => void, onDrop: (e: any) => void },
 * }}
 */
export function useFileSelect({ accept, onFile }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const open = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // allow re-selecting the same file
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return {
    isDragging,
    open,
    inputProps: { ref: inputRef, type: 'file', accept, onChange: handleChange },
    zoneProps: {
      onClick: open,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
