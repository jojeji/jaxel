import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/**
 * Moves a child from `sourceParent[sourceIndex]` to `targetParent[targetIndex]` (covers
 * reordering within one parent and moving across parents, e.g. drag-and-drop).
 *
 * Contract: `targetIndex` is interpreted against `targetParent.children` AFTER the source
 * item has been removed. When `sourceParent === targetParent` and `sourceIndex < targetIndex`,
 * the caller must pass `targetIndex - 1` to land after the intended sibling — this command
 * does not auto-adjust, to keep do()/undo() symmetric and predictable.
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
