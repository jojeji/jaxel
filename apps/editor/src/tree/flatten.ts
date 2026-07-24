import type { ChangeSet, DocNode, Tombstone } from "@jaxel/core";
import { walkTree } from "./walk.js";

export interface TreeRow {
  node: DocNode;
  /** Chain from the document root down to (not including) `node` — root first. */
  ancestors: DocNode[];
  depth: number;
  hasChildren: boolean;
}

/** Depth-first flattening of the visible (expanded) part of the tree, root first. */
export function flattenTree(root: DocNode, expanded: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  walkTree(root, (node, ancestors, depth) => {
    const hasChildren = node.children.length > 0;
    rows.push({ node, ancestors, depth, hasChildren });
    return hasChildren && expanded.has(node.id); // only descend into expanded nodes
  });
  return rows;
}

/** A real tree row, or a tombstone placeholder for a node deleted since the change baseline
 * (see @jaxel/core computeChanges, CONTEXT.md "Tombstone"). Rendering-only overlay: selection,
 * keyboard navigation, and drag&drop all keep operating on the underlying `TreeRow` list —
 * tombstone entries carry no such callbacks (purely informational, per the grill session
 * 2026-07-22 decision). */
export type DisplayRow = { kind: "node"; row: TreeRow } | { kind: "tombstone"; tombstone: Tombstone; depth: number };

/**
 * Interleaves tombstones into an already-flattened `rows` list, anchored per
 * CONTEXT.md "Anker-Geschwister": a tombstone appears right after its anchor sibling's full
 * (possibly expanded) subtree, or as the first child if it has no surviving anchor.
 *
 * Known simplification: if a node's LAST real child was deleted while the node itself was
 * collapsed, its twisty disappears (real `hasChildren` is now false) with no way to re-expand
 * and reveal the tombstones — accepted for v1 rather than touching the unrelated, heavily-used
 * expand/collapse logic in App.tsx just for this edge case (see docs/status.md).
 */
export function withTombstones(rows: TreeRow[], changes: ChangeSet | null): DisplayRow[] {
  if (!changes || changes.tombstones.length === 0) {
    return rows.map((row): DisplayRow => ({ kind: "node", row }));
  }

  const tombstonesByParent = new Map<string, Tombstone[]>();
  for (const tombstone of changes.tombstones) {
    const list = tombstonesByParent.get(tombstone.parentId);
    if (list) list.push(tombstone);
    else tombstonesByParent.set(tombstone.parentId, [tombstone]);
  }
  for (const list of tombstonesByParent.values()) list.sort((a, b) => a.baselineIndex - b.baselineIndex);

  const result: DisplayRow[] = [];
  let cursor = 0;

  /** Consumes every consecutive row at exactly `depth` belonging to `parentId` (a depth-first
   * flattening always groups one parent's present children consecutively at a fixed depth),
   * plus each child's own descendant block, emitting that parent's tombstones at the right
   * anchor points as it goes. */
  function consumeChildrenOf(parentId: string, depth: number): void {
    const tombstonesHere = tombstonesByParent.get(parentId) ?? [];
    for (const tombstone of tombstonesHere.filter((t) => t.anchorPreviousSiblingId === null)) {
      result.push({ kind: "tombstone", tombstone, depth });
    }
    while (cursor < rows.length && rows[cursor]!.depth === depth) {
      const row = rows[cursor]!;
      result.push({ kind: "node", row });
      cursor++;
      if (cursor < rows.length && rows[cursor]!.depth === depth + 1) {
        consumeChildrenOf(row.node.id, depth + 1);
      }
      for (const tombstone of tombstonesHere.filter((t) => t.anchorPreviousSiblingId === row.node.id)) {
        result.push({ kind: "tombstone", tombstone, depth });
      }
    }
  }

  if (rows.length > 0) {
    result.push({ kind: "node", row: rows[0]! });
    cursor = 1;
    if (cursor < rows.length && rows[cursor]!.depth === 1) {
      consumeChildrenOf(rows[0]!.node.id, 1);
    }
  }
  return result;
}
