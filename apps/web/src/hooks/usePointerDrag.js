import { useState } from 'react';

/**
 * Generic pointer-drag hook that records start position + initial offset and
 * yields a delta-applied next state via onCommit.
 *
 * @param {object} options
 * @param {() => { x: number, y: number }} options.getInitialPosition  current offset in canvas-reference px
 * @param {number} options.scaleFactor                                  preview-px to canvas-px ratio
 * @param {(next: { x: number, y: number }) => void} options.onCommit  fires every pointermove
 * @param {boolean} [options.stopPropagation=false]                     for stacked draggables (subtitle inside video)
 * @returns {object} handlers + isDragging
 */
export function usePointerDrag({
  getInitialPosition,
  scaleFactor,
  onCommit,
  stopPropagation = false,
}) {
  const [drag, setDrag] = useState(null);

  function onPointerDown(e) {
    if (!onCommit) return;
    if (stopPropagation) e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const init = getInitialPosition();
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      initialX: init.x,
      initialY: init.y,
    });
  }

  function onPointerMove(e) {
    if (!drag) return;
    const dxScreen = e.clientX - drag.startX;
    const dyScreen = e.clientY - drag.startY;
    const dxCanvas = dxScreen / scaleFactor;
    const dyCanvas = dyScreen / scaleFactor;
    onCommit({
      x: Math.round(drag.initialX + dxCanvas),
      y: Math.round(drag.initialY + dyCanvas),
    });
  }

  function onPointerUp(e) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDrag(null);
  }

  return {
    isDragging: drag !== null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
