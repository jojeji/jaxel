import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/**
 * `ancestors` is the chain from the root down to `node`'s direct parent (root first,
 * `node` itself NOT included) — the same shape `path.ts`'s `computePaths` consumes. Passed
 * on as `byteRangeChain` (with `node` appended): CommandBus invalidates/restores byteRange
 * up to the root centrally, since minimal-invasive save trusts an ancestor's byteRange to
 * mean "nothing changed underneath" (see command-bus.ts and commands/byte-range.ts).
 */
export function createRenameCommand(node: DocNode, newName: string, ancestors: DocNode[]): Command {
  const previousName = node.name;

  return {
    label: "rename",
    byteRangeChain: [...ancestors, node],
    do() {
      node.name = newName;
    },
    undo() {
      node.name = previousName;
    },
  };
}
