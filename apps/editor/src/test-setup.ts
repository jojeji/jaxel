import "@testing-library/jest-dom/vitest";

// jsdom has no native PointerEvent (used by the search/sidebar resize handles) — a thin
// MouseEvent-based stand-in is enough to carry clientX/clientY through fireEvent.pointerX calls.
if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  // @ts-expect-error jsdom lacks a native PointerEvent implementation
  window.PointerEvent = PointerEventPolyfill;
}
