import type { DocNode } from "../model/node.js";

export interface SiblingSlot {
  parent: DocNode;
  /** Chain from root to `parent`'s own parent (root first, `parent` NOT included) — the
   * shape `createInsertNodeCommand`/`createRemoveNodeCommand` expect. */
  parentAncestors: DocNode[];
  /** The row's own index among its siblings. Insert-as-next-sibling callers want `index + 1`. */
  index: number;
}

/**
 * Locates `row`'s slot among its own siblings — used by every "insert/remove/duplicate a
 * sibling of the selection" handler (add sibling, delete, duplicate, paste). Returns `null`
 * for the root (nothing to be a sibling of) or if `row.node` isn't actually found among its
 * claimed parent's children (defensive against a stale row from a prior render).
 */
export function findSiblingSlot(row: { node: DocNode; ancestors: DocNode[] }): SiblingSlot | null {
  const parent = row.ancestors[row.ancestors.length - 1];
  if (!parent) return null; // root has no siblings
  const parentAncestors = row.ancestors.slice(0, -1);
  const index = parent.children.indexOf(row.node);
  if (index === -1) return null;
  return { parent, parentAncestors, index };
}
