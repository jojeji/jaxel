import type { DocNode, JsonPrimitiveType } from "../model/node.js";
import type { Command } from "./command.js";

/** `ancestors`: chain from root to `node`'s direct parent (root first, `node` not included). See rename.ts for why the whole chain's byteRange must be invalidated. */
export function createSetValueCommand(
  node: DocNode,
  newValue: string | null,
  newJsonType: JsonPrimitiveType | undefined,
  ancestors: DocNode[],
): Command {
  const previousValue = node.value;
  const previousJsonType = node.jsonType;

  return {
    label: "set-value",
    byteRangeChain: [...ancestors, node],
    do() {
      node.value = newValue;
      node.jsonType = newJsonType;
    },
    undo() {
      node.value = previousValue;
      node.jsonType = previousJsonType;
    },
  };
}
