import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/**
 * Renames the attribute at `index` (position and value stay untouched). Addressed by
 * index instead of name so a live per-keystroke rename chain ("r" -> "ro" -> "role")
 * keeps hitting the same attribute; pair with `coalesceKey` so that chain is ONE undo
 * step. `ancestors`: chain from root to `node`'s direct parent (see rename.ts for why
 * the whole chain's byteRange must be invalidated).
 */
export function createRenameAttributeCommand(
  node: DocNode,
  index: number,
  newName: string,
  ancestors: DocNode[],
  coalesceKey?: string,
): Command {
  const previousName = node.attributes[index]?.name ?? "";

  return {
    label: "rename-attribute",
    coalesceKey,
    byteRangeChain: [...ancestors, node],
    do() {
      const attribute = node.attributes[index];
      if (!attribute) return;
      attribute.name = newName;
    },
    undo() {
      const attribute = node.attributes[index];
      if (!attribute) return;
      attribute.name = previousName;
    },
  };
}
