import type { DocNode, JsonPrimitiveType } from "../model/node.js";
import type { Command } from "./command.js";

const JSON_NUMBER = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

/**
 * The JSON type a leaf has after its value text was changed to `text` — the one rule every
 * value edit (inline edit, "Alle ersetzen") goes through. A number, boolean or null keeps its
 * type only while `text` is still a valid literal of that type; otherwise it becomes a string.
 * json-export writes non-strings unquoted, so keeping the old type for "42 items" would write
 * `"n": 42 items` — a file Jaxel itself could no longer open. A string stays a string even when
 * digits are typed into it (that is what the user asked for). XML values have no type.
 */
export function jsonTypeAfterEdit(
  previous: JsonPrimitiveType | undefined,
  text: string,
): JsonPrimitiveType | undefined {
  switch (previous) {
    case "number":
      return JSON_NUMBER.test(text) ? "number" : "string";
    case "boolean":
      return text === "true" || text === "false" ? "boolean" : "string";
    case "null":
      return text === "null" ? "null" : "string";
    default:
      return previous;
  }
}

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
