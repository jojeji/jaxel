import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";
import { captureByteRanges, clearByteRanges, restoreByteRanges } from "./byte-range.js";

/**
 * Renaming invalidates byteRange on `node` AND every ancestor up to the root (see
 * byte-range.ts) — not just `node` itself, since minimal-invasive save trusts an
 * ancestor's byteRange to mean "nothing changed underneath".
 *
 * `ancestors` is the chain from the root down to `node`'s direct parent (root first,
 * `node` itself NOT included) — the same shape `path.ts`'s `computePaths` consumes.
 */
export function createRenameCommand(node: DocNode, newName: string, ancestors: DocNode[]): Command {
  const previousName = node.name;
  const chain = [...ancestors, node];
  const previousByteRanges = captureByteRanges(chain);

  return {
    label: "rename",
    do() {
      node.name = newName;
      clearByteRanges(chain);
    },
    undo() {
      node.name = previousName;
      restoreByteRanges(chain, previousByteRanges);
    },
  };
}
