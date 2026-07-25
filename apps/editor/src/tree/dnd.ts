import { findAncestorChain, type DocNode, type DropPosition } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";

/** Maps a pointer's vertical position within a row (0 = top edge, 1 = bottom edge) to a drop
 * position — the outer quarters mean "insert as sibling before/after", the middle half means
 * "insert as a child". */
export function positionFromRatio(ratio: number): DropPosition {
  return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "into";
}

/**
 * Whether `dragNode` may be dropped at `position` relative to `target` — used by TreeView's
 * drag handlers to decide both the live drop-indicator and the actual drop. Rejects dropping
 * onto itself, into its own subtree (would corrupt the tree — the moved node can't become its
 * own descendant), and as a sibling of the visible root (which has no sibling level).
 */
export function computeDropAllowed(dragNode: DocNode, target: TreeRow, position: DropPosition): boolean {
  if (target.node.id === dragNode.id) return false;
  if (findAncestorChain(dragNode, target.node) !== null) return false; // target is in dragNode's own subtree
  if (position !== "into" && target.ancestors.length === 0) return false; // no siblings of the root
  return true;
}
