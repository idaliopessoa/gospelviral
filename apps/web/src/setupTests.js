import '@testing-library/jest-dom/vitest';

// jsdom ships no PointerEvent. Provide a minimal MouseEvent-compatible shim so
// React Testing Library's fireEvent.pointer* carries clientX/clientY/pointerId
// through to component handlers.
if (globalThis.PointerEvent === undefined) {
  class PointerEventShim extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  globalThis.PointerEvent = PointerEventShim;
}
