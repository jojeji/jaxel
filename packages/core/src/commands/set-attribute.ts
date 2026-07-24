import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";

/**
 * `value: null` removes the attribute. Works uniformly for add/change/remove.
 * `ancestors`: chain from root to `node`'s direct parent (root first, `node` not
 * included). See rename.ts for why the whole chain's byteRange must be invalidated.
 */
export function createSetAttributeCommand(
  node: DocNode,
  name: string,
  value: string | null,
  ancestors: DocNode[],
  coalesceKey?: string,
): Command {
  const previousIndex = node.attributes.findIndex((attribute) => attribute.name === name);
  const previousValue = previousIndex >= 0 ? node.attributes[previousIndex]!.value : null;

  function apply(nextValue: string | null): void {
    const index = node.attributes.findIndex((attribute) => attribute.name === name);
    if (nextValue === null) {
      if (index >= 0) node.attributes.splice(index, 1);
    } else if (index >= 0) {
      node.attributes[index]!.value = nextValue;
    } else {
      node.attributes.push({ name, value: nextValue });
    }
  }

  return {
    label: "set-attribute",
    coalesceKey,
    byteRangeChain: [...ancestors, node],
    do() {
      apply(value);
    },
    undo() {
      apply(previousValue);
    },
  };
}
