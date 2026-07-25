/** New `scrollTop` that keeps the row at index `newIndex` at the same pixel offset within the
 * viewport it was at before a toggle changed the row count — otherwise the browser clamping
 * `scrollTop` to a shorter/taller content height would make the toggled row visibly drift. */
export function computeAnchoredScrollTop(newIndex: number, offsetInViewport: number, rowHeight: number): number {
  return Math.max(0, newIndex * rowHeight - offsetInViewport);
}

/** New `scrollTop` to bring the row at `index` into view — a no-op (returns `currentScrollTop`
 * unchanged) if it's already fully visible; otherwise centers it in the viewport. */
export function computeRevealScrollTop(
  index: number,
  rowHeight: number,
  currentScrollTop: number,
  viewportHeight: number,
): number {
  const target = index * rowHeight;
  const viewBottom = currentScrollTop + viewportHeight;
  if (target >= currentScrollTop && target + rowHeight <= viewBottom) return currentScrollTop;
  return Math.max(0, target - viewportHeight / 2);
}
