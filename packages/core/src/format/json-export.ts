/**
 * DocNode -> JSON export. Reverses the mapping described in `json-import.ts` and
 * docs/entscheidungen.md #4: sibling nodes that share a name are folded back into a JSON array;
 * differently-named children of a node become that node's object properties; `jsonType` decides
 * how a leaf's `value` is written back out (raw number text, escaped string, or a bare
 * true/false/null literal).
 */

import type { DocNode, JsonPrimitiveType } from "../model/node.js";

export interface JsonExportDoc {
  root: DocNode;
  /** e.g. "  " or "\t". */
  indent: string;
}

/**
 * Serializes a DocNode tree back to JSON text.
 *
 * If `root.synthetic` and `root.name === "$root"`, the invented wrapper is stripped so the
 * output is again a bare array/primitive/multi-key object (whatever the original root was) with
 * no enclosing `{"$root": ...}`. Any other root (including the "real key, but had to be flagged
 * synthetic because its value didn't collapse to one node" case from json-import.ts) is written
 * back as `{"<root.name>": <root's own value>}`.
 */
export function serializeJson(doc: JsonExportDoc): string {
  const { root, indent } = doc;
  if (root.synthetic && root.name === "$root") {
    return nodeToJsonText(root, indent, 0);
  }
  return objectText([[root.name, nodeToJsonText(root, indent, 1)]], indent, 0);
}

/** What JSON value does this single node, on its own, represent? */
function nodeToJsonText(node: DocNode, indent: string, level: number): string {
  if (node.value !== null) {
    return formatPrimitive(node.value, node.jsonType);
  }
  if (node.children.length === 0) {
    // An object with no properties (rule 1 applied to `{}`). An empty JSON array as a property
    // value is indistinguishable from this at the tree level (it contributes zero sibling nodes
    // on import, see rule 2/3) — a known, accepted lossy edge of this mapping convention.
    return "{}";
  }
  // All children sharing this node's own name is the signature of rule 4 (array-of-arrays name
  // propagation): this node's value is a bare JSON array of its children's values.
  const isArrayContinuation = node.children.every((child) => child.name === node.name);
  if (isArrayContinuation) {
    return arrayText(
      node.children.map((child) => nodeToJsonText(child, indent, level + 1)),
      indent,
      level,
    );
  }
  const groups = groupByName(node.children);
  const entries: Array<[string, string]> = groups.map(([name, group]) => {
    const value =
      group.length === 1
        ? nodeToJsonText(group[0]!, indent, level + 1)
        : arrayText(
            group.map((g) => nodeToJsonText(g, indent, level + 1)),
            indent,
            level + 1,
          );
    return [name, value];
  });
  return objectText(entries, indent, level);
}

/** Groups nodes by `name`, preserving first-occurrence order (JSON property order). */
function groupByName(nodes: DocNode[]): Array<[string, DocNode[]]> {
  const order: string[] = [];
  const map = new Map<string, DocNode[]>();
  for (const node of nodes) {
    let group = map.get(node.name);
    if (!group) {
      group = [];
      map.set(node.name, group);
      order.push(node.name);
    }
    group.push(node);
  }
  return order.map((name) => [name, map.get(name)!]);
}

function formatPrimitive(value: string, jsonType: JsonPrimitiveType | undefined): string {
  switch (jsonType) {
    case "number":
    case "boolean":
    case "null":
      // Numbers keep their original source text (e.g. "1.50") for a lossless round-trip;
      // booleans/null are already exactly "true"/"false"/"null".
      return value;
    case "string":
    default:
      return escapeJsonString(value);
  }
}

function escapeJsonString(value: string): string {
  let out = '"';
  for (const ch of value) {
    switch (ch) {
      case '"':
        out += '\\"';
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      default: {
        const code = ch.codePointAt(0)!;
        if (code < 0x20) {
          out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += ch;
        }
      }
    }
  }
  return out + '"';
}

function objectText(entries: Array<[string, string]>, indent: string, level: number): string {
  if (entries.length === 0) return "{}";
  const pad = indent.repeat(level + 1);
  const closePad = indent.repeat(level);
  const lines = entries.map(([key, value]) => `${pad}${escapeJsonString(key)}: ${value}`);
  return `{\n${lines.join(",\n")}\n${closePad}}`;
}

function arrayText(items: string[], indent: string, level: number): string {
  if (items.length === 0) return "[]";
  const pad = indent.repeat(level + 1);
  const closePad = indent.repeat(level);
  const lines = items.map((item) => `${pad}${item}`);
  return `[\n${lines.join(",\n")}\n${closePad}]`;
}
