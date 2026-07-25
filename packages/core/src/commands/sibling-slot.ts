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

export interface InsertPlan {
  parent: DocNode;
  /** Chain from root to `parent`'s own parent (root first, `parent` NOT included). */
  parentAncestors: DocNode[];
  /** Index to insert the new node at. */
  index: number;
  /** `true` when there was no sibling level (row is the tab's visible root) and the plan
   * inserts into `row.node` itself as its last child instead. */
  insertedAsChild: boolean;
}

/**
 * Plans where to insert a new node "relative to" `row` — used by every "insert as next
 * sibling of the selection, falling back to append-as-child at the root" handler (add
 * sibling, paste). At the tab's own visible root there is no sibling level, so the plan
 * appends as the root's last child instead. Returns `null` only for the defensive
 * stale-row case (row not actually found among its claimed parent's children) — same as
 * `findSiblingSlot`.
 */
export function planInsertRelativeToRow(row: { node: DocNode; ancestors: DocNode[] }): InsertPlan | null {
  if (row.ancestors.length === 0) {
    return { parent: row.node, parentAncestors: row.ancestors, index: row.node.children.length, insertedAsChild: true };
  }
  const slot = findSiblingSlot(row);
  if (!slot) return null; // stale row: not actually found among its claimed parent's children
  return { parent: slot.parent, parentAncestors: slot.parentAncestors, index: slot.index + 1, insertedAsChild: false };
}
