import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";
import { captureByteRanges, clearByteRanges, restoreByteRanges } from "./byte-range.js";

/**
 * `parentAncestors`: chain from root to `parent`'s own parent (root first, `parent`
 * itself NOT included). See rename.ts / byte-range.ts for why the whole chain up to
 * the root must be invalidated, not just `parent`.
 */
export function createRemoveNodeCommand(parent: DocNode, index: number, parentAncestors: DocNode[]): Command {
  let removedNode: DocNode | undefined;
  const chain = [...parentAncestors, parent];
  const previousByteRanges = captureByteRanges(chain);

  return {
    label: "remove-node",
    do() {
      removedNode = parent.children.splice(index, 1)[0];
      clearByteRanges(chain);
    },
    undo() {
      if (!removedNode) return;
      parent.children.splice(index, 0, removedNode);
      restoreByteRanges(chain, previousByteRanges);
    },
  };
}
