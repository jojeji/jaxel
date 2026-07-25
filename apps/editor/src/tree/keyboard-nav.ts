import type { TreeRow } from "./flatten.js";

/**
 * The next row up/down arrow-key navigation should select, given the currently flattened
 * `rows` and the currently selected node id. `delta` is `+1` (ArrowDown) or `-1` (ArrowUp).
 * No selection yet: `+1` lands on the first row, `-1` on the last (matches scrolling into
 * the list from either end). Returns `null` only when there are no rows to select at all.
 */
export function nextSelectedRow(rows: TreeRow[], selectedNodeId: string | null, delta: number): TreeRow | null {
  if (rows.length === 0) return null;
  const currentIndex = selectedNodeId ? rows.findIndex((row) => row.node.id === selectedNodeId) : -1;
  const nextIndex =
    currentIndex === -1 ? (delta > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, currentIndex + delta));
  return rows[nextIndex] ?? null;
}

/** What an arrow-key press on a tree row should do — the caller applies it to React state. */
export type ArrowIntent =
  | { type: "expand"; nodeId: string }
  | { type: "select"; nodeId: string }
  | { type: "collapse"; nodeId: string }
  | { type: "none" };

/** ArrowRight: expand a collapsed node with children, or move selection to its first child
 * if already expanded. No-op on a childless row. */
export function planArrowRight(row: TreeRow, expanded: ReadonlySet<string>): ArrowIntent {
  if (!row.hasChildren) return { type: "none" };
  if (!expanded.has(row.node.id)) return { type: "expand", nodeId: row.node.id };
  const firstChild = row.node.children[0];
  return firstChild ? { type: "select", nodeId: firstChild.id } : { type: "none" };
}

/** ArrowLeft: collapse an expanded node with children, or move selection to its parent
 * otherwise. No-op on a collapsed/childless row with no parent (the visible root). */
export function planArrowLeft(row: TreeRow, expanded: ReadonlySet<string>): ArrowIntent {
  if (row.hasChildren && expanded.has(row.node.id)) return { type: "collapse", nodeId: row.node.id };
  const parent = row.ancestors[row.ancestors.length - 1];
  return parent ? { type: "select", nodeId: parent.id } : { type: "none" };
}
