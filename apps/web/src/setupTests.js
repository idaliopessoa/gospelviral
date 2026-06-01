import '@testing-library/jest-dom/vitest';

// jsdom does not implement HTMLMediaElement playback — its play/pause throw
// "Not implemented". After D1 a <video> mounts in more scenarios (edit too) and
// the reactive-pause effect calls pause() on mount, so provide silent default
// stubs here. Tests that assert on play/pause override these in their own
// beforeEach (e.g. with a vi.fn that dispatches media events).
// jsdom has no Canvas 2D backend (logs "Not implemented: getContext"). The
// subtitle font-size derivation probes it via measureCharAdvanceEm and falls
// back gracefully; stub getContext → null so that probe is silent in tests.
if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = () => null;
}

if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = function play() {
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function pause() {};
}

// jsdom ships no PointerEvent. Provide a minimal MouseEvent-compatible shim so
// React Testing Library's fireEvent.pointer* carries clientX/clientY/pointerId
// through to component handlers.
// Guarded on MouseEvent so node-environment tests (e.g. the Vite build
// regression) that share this setup file don't trip on the browser-only global.
if (globalThis.PointerEvent === undefined && typeof MouseEvent !== 'undefined') {
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
