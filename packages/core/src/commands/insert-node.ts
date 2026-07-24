import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/**
 * Inserting invalidates byteRange on `parent` AND every ancestor up to the root (the
 * new `node` itself has no byteRange yet, so nothing to clear there). See rename.ts /
 * byte-range.ts for why the whole chain matters, not just `parent`.
 *
 * `parentAncestors`: chain from root to `parent`'s own parent (root first, `parent`
 * itself NOT included).
 */
export function createInsertNodeCommand(
  parent: DocNode,
  index: number,
  node: DocNode,
  parentAncestors: DocNode[],
): Command {
  return {
    label: "insert-node",
    byteRangeChain: [...parentAncestors, parent],
    do() {
      parent.children.splice(index, 0, node);
    },
    undo() {
      parent.children.splice(index, 1);
    },
  };
}
