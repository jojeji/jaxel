import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/** Where a dropped row lands relative to the row it was dropped on. */
export type DropPosition = "before" | "after" | "into";

export interface MovePlan {
  sourceParent: DocNode;
  sourceIndex: number;
  sourceAncestors: DocNode[];
  targetParent: DocNode;
  targetIndex: number;
  targetAncestors: DocNode[];
}

/**
 * Translates a drag&drop drop (source row, a target row, and where relative to it) into the
 * raw parent/index arguments `createMoveNodeCommand` needs — including the index correction
 * its own contract requires (see below) when reordering within the same parent past the
 * source's original position. Returns `null` for anything that isn't a real move: the root
 * has no parent to remove it from, "before"/"after" the root (no siblings), or a no-op
 * (dropping a node back where it already was).
 */
export function planMove(
  source: { node: DocNode; ancestors: DocNode[] },
  target: { node: DocNode; ancestors: DocNode[] },
  position: DropPosition,
): MovePlan | null {
  const sourceParent = source.ancestors[source.ancestors.length - 1];
  if (!sourceParent) return null; // root is not draggable
  const sourceAncestors = source.ancestors.slice(0, -1);
  const sourceIndex = sourceParent.children.indexOf(source.node);
  if (sourceIndex === -1) return null;

  let targetParent: DocNode;
  let targetAncestors: DocNode[];
  let targetIndex: number;
  if (position === "into") {
    targetParent = target.node;
    targetAncestors = target.ancestors;
    targetIndex = target.node.children.length;
  } else {
    const parent = target.ancestors[target.ancestors.length - 1];
    if (!parent) return null; // the root has no siblings
    targetParent = parent;
    targetAncestors = target.ancestors.slice(0, -1);
    const anchorIndex = parent.children.indexOf(target.node);
    if (anchorIndex === -1) return null;
    targetIndex = position === "after" ? anchorIndex + 1 : anchorIndex;
  }
  if (targetParent === sourceParent && targetIndex > sourceIndex) {
    targetIndex -= 1; // contract: targetIndex counts AFTER the source was removed
  }
  if (targetParent === sourceParent && targetIndex === sourceIndex) return null; // no-op move

  return { sourceParent, sourceIndex, sourceAncestors, targetParent, targetIndex, targetAncestors };
}

/**
 * Moves a child from `sourceParent[sourceIndex]` to `targetParent[targetIndex]` (covers
 * reordering within one parent and moving across parents, e.g. drag-and-drop).
 *
 * Contract: `targetIndex` is interpreted against `targetParent.children` AFTER the source
 * item has been removed. When `sourceParent === targetParent` and `sourceIndex < targetIndex`,
 * the caller must pass `targetIndex - 1` to land after the intended sibling — this command
 * does not auto-adjust, to keep do()/undo() symmetric and predictable. `planMove` above
 * already does this adjustment for the drag&drop caller.
 *
 * `sourceAncestors`/`targetAncestors`: chain from root to the respective parent's own
 * parent (root first, the parent itself NOT included). Both parents' full ancestor
 * chains get their byteRange invalidated (see rename.ts / byte-range.ts) — if
 * `sourceParent === targetParent`, pass the same chain for both, it's safe to invalidate twice.
 */
export function createMoveNodeCommand(
  sourceParent: DocNode,
  sourceIndex: number,
  sourceAncestors: DocNode[],
  targetParent: DocNode,
  targetIndex: number,
  targetAncestors: DocNode[],
): Command {
  const sourceChain = [...sourceAncestors, sourceParent];
  const targetChain = [...targetAncestors, targetParent];

  return {
    label: "move-node",
    byteRangeChain: [...sourceChain, ...targetChain],
    do() {
      const [node] = sourceParent.children.splice(sourceIndex, 1);
      if (!node) return;
      targetParent.children.splice(targetIndex, 0, node);
    },
    undo() {
      const [node] = targetParent.children.splice(targetIndex, 1);
      if (!node) return;
      sourceParent.children.splice(sourceIndex, 0, node);
    },
  };
}
