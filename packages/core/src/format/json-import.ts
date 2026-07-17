/**
 * JSON -> DocNode import.
 *
 * Mapping convention: docs/entscheidungen.md #4. Deliberately NOT Badgerfish-style (`@attr`, `$`):
 * a JSON object becomes one node per property; a JSON array becomes several same-named sibling
 * nodes at the parent (so the tree already carries the shape a[0], a[1], ... implies); a JSON
 * primitive becomes a leaf node with `value` + `jsonType`.
 *
 * We do NOT use `JSON.parse` as the source of truth: it would silently normalize number text
 * (e.g. "1.50" -> 1.5, or corrupt integers beyond Number.MAX_SAFE_INTEGER) and JS engines are not
 * contractually required to preserve object key order. Instead this file contains a small
 * hand-rolled recursive-descent JSON parser that keeps the original number text verbatim and
 * walks object keys in source order.
 */

import { createNode, type DocNode, type JsonPrimitiveType } from "../model/node.js";

type JObject = { kind: "object"; entries: Array<[string, JVal]> };
type JArray = { kind: "array"; items: JVal[] };
type JString = { kind: "string"; text: string };
type JNumber = { kind: "number"; raw: string };
type JBoolean = { kind: "boolean"; value: boolean };
type JNull = { kind: "null" };
type JVal = JObject | JArray | JString | JNumber | JBoolean | JNull;

class JsonSyntaxError extends Error {}

/** Hand-rolled JSON scanner/parser: keeps raw number text and object key order intact. */
function parseJsonSource(source: string): JVal {
  let i = 0;
  const n = source.length;

  function fail(message: string): never {
    throw new JsonSyntaxError(`${message} (at position ${i})`);
  }

  function skipWs(): void {
    while (i < n) {
      const c = source.charCodeAt(i);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) i++;
      else break;
    }
  }

  function expectLiteral(lit: string): void {
    if (source.slice(i, i + lit.length) !== lit) fail(`Expected '${lit}'`);
    i += lit.length;
  }

  function isDigit(c: string | undefined): boolean {
    return c !== undefined && c >= "0" && c <= "9";
  }

  function parseValue(): JVal {
    skipWs();
    const c = source[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return { kind: "string", text: parseStringRaw() };
    if (c === "t") {
      expectLiteral("true");
      return { kind: "boolean", value: true };
    }
    if (c === "f") {
      expectLiteral("false");
      return { kind: "boolean", value: false };
    }
    if (c === "n") {
      expectLiteral("null");
      return { kind: "null" };
    }
    if (c === "-" || isDigit(c)) return parseNumber();
    fail(`Unexpected token '${c ?? "<eof>"}'`);
  }

  function parseObject(): JObject {
    i++; // consume '{'
    const entries: Array<[string, JVal]> = [];
    skipWs();
    if (source[i] === "}") {
      i++;
      return { kind: "object", entries };
    }
    for (;;) {
      skipWs();
      if (source[i] !== '"') fail("Expected string key");
      const key = parseStringRaw();
      skipWs();
      if (source[i] !== ":") fail("Expected ':'");
      i++;
      const value = parseValue();
      entries.push([key, value]);
      skipWs();
      if (source[i] === ",") {
        i++;
        continue;
      }
      if (source[i] === "}") {
        i++;
        break;
      }
      fail("Expected ',' or '}'");
    }
    return { kind: "object", entries };
  }

  function parseArray(): JArray {
    i++; // consume '['
    const items: JVal[] = [];
    skipWs();
    if (source[i] === "]") {
      i++;
      return { kind: "array", items };
    }
    for (;;) {
      items.push(parseValue());
      skipWs();
      if (source[i] === ",") {
        i++;
        continue;
      }
      if (source[i] === "]") {
        i++;
        break;
      }
      fail("Expected ',' or ']'");
    }
    return { kind: "array", items };
  }

  function parseStringRaw(): string {
    i++; // consume opening quote
    let out = "";
    for (;;) {
      if (i >= n) fail("Unterminated string");
      const c = source[i];
      if (c === '"') {
        i++;
        break;
      }
      if (c === "\\") {
        i++;
        const esc = source[i];
        switch (esc) {
          case '"':
            out += '"';
            i++;
            break;
          case "\\":
            out += "\\";
            i++;
            break;
          case "/":
            out += "/";
            i++;
            break;
          case "b":
            out += "\b";
            i++;
            break;
          case "f":
            out += "\f";
            i++;
            break;
          case "n":
            out += "\n";
            i++;
            break;
          case "r":
            out += "\r";
            i++;
            break;
          case "t":
            out += "\t";
            i++;
            break;
          case "u": {
            const hex = source.slice(i + 1, i + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Invalid \\u escape");
            out += String.fromCharCode(parseInt(hex, 16));
            i += 5;
            break;
          }
          default:
            fail(`Invalid escape '\\${esc ?? ""}'`);
        }
      } else {
        out += c;
        i++;
      }
    }
    return out;
  }

  function parseNumber(): JNumber {
    const start = i;
    if (source[i] === "-") i++;
    if (source[i] === "0") {
      i++;
    } else if (isDigit(source[i])) {
      while (isDigit(source[i])) i++;
    } else {
      fail("Invalid number");
    }
    if (source[i] === ".") {
      i++;
      if (!isDigit(source[i])) fail("Invalid number");
      while (isDigit(source[i])) i++;
    }
    if (source[i] === "e" || source[i] === "E") {
      i++;
      if (source[i] === "+" || source[i] === "-") i++;
      if (!isDigit(source[i])) fail("Invalid number");
      while (isDigit(source[i])) i++;
    }
    return { kind: "number", raw: source.slice(start, i) };
  }

  const result = parseValue();
  skipWs();
  if (i !== n) fail("Unexpected trailing content after JSON value");
  return result;
}

function jsonTypeOf(val: JString | JNumber | JBoolean | JNull): JsonPrimitiveType {
  switch (val.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
  }
}

function rawTextOf(val: JString | JNumber | JBoolean | JNull): string {
  switch (val.kind) {
    case "string":
      return val.text;
    case "number":
      return val.raw;
    case "boolean":
      return val.value ? "true" : "false";
    case "null":
      return "null";
  }
}

function primitiveNode(name: string, val: JString | JNumber | JBoolean | JNull): DocNode {
  return createNode({ name, value: rawTextOf(val), jsonType: jsonTypeOf(val) });
}

/** Rule 1: object -> one node with one child per property, in source order. */
function objectToNode(name: string, entries: Array<[string, JVal]>): DocNode {
  return createNode({
    name,
    children: entries.flatMap(([key, value]) => propertyToNodes(key, value)),
  });
}

/**
 * A single array element. Rule 3: object element -> its own child nodes (rule 1). Rule 4: array
 * element that is itself an array -> the name propagates one level further down. Rule 5:
 * primitive element -> a leaf node.
 */
function arrayElementToNode(name: string, val: JVal): DocNode {
  if (val.kind === "object") return objectToNode(name, val.entries);
  if (val.kind === "array") {
    return createNode({ name, children: val.items.map((item) => arrayElementToNode(name, item)) });
  }
  return primitiveNode(name, val);
}

/**
 * The node(s) a single object property expands to. Rule 2/3: an array value produces several
 * same-named sibling nodes (one per element) instead of a single wrapper node. Rule 1/5: object
 * and primitive values produce exactly one node.
 */
function propertyToNodes(name: string, val: JVal): DocNode[] {
  if (val.kind === "array") return val.items.map((item) => arrayElementToNode(name, item));
  if (val.kind === "object") return [objectToNode(name, val.entries)];
  return [primitiveNode(name, val)];
}

/**
 * Parses a JSON document into a single DocNode root (rule 6, docs/entscheidungen.md #4).
 *
 * Root special cases:
 * - Object with exactly one key: that key becomes the root's name directly (no synthetic
 *   wrapper) and rule 1 is applied to its value. When that value collapses to exactly one node
 *   (the common case: an object, a single primitive, or a one-element array — as in the
 *   `{"person": [{...}]}` reference example) the root IS that node.
 *   Design decision (not fully specified by the mapping convention): if the value instead expands
 *   to zero or several sibling nodes (an empty array, or an array with more than one element),
 *   there is no way to represent that as a single root node without introducing an extra tree
 *   level. We keep the real key as the root's name (it is not an invented name) but still mark it
 *   `synthetic: true` since an extra level had to be introduced that has no direct JSON
 *   counterpart. See the "multi-element array under a single root key" test below.
 * - Object with zero or several keys, a top-level array, or a top-level primitive: a synthetic
 *   `$root` node is invented (rule 6, bullet 2), computed as if the whole root value were the
 *   value of a property named "$root".
 *   Design decision: for a bare primitive root, the root node itself carries `value`/`jsonType`
 *   directly instead of a further synthetic child — simpler and round-trips more cleanly than a
 *   `$root` node wrapping a single `$root` child.
 */
export function parseJson(source: string): { root: DocNode } {
  const rootVal = parseJsonSource(source);

  if (rootVal.kind === "object") {
    if (rootVal.entries.length === 1) {
      const [key, value] = rootVal.entries[0]!;
      const nodes = propertyToNodes(key, value);
      if (nodes.length === 1) {
        return { root: nodes[0]! };
      }
      return { root: createNode({ name: key, synthetic: true, children: nodes }) };
    }
    return {
      root: createNode({
        name: "$root",
        synthetic: true,
        children: rootVal.entries.flatMap(([key, value]) => propertyToNodes(key, value)),
      }),
    };
  }

  if (rootVal.kind === "array") {
    return {
      root: createNode({
        name: "$root",
        synthetic: true,
        children: rootVal.items.map((item) => arrayElementToNode("$root", item)),
      }),
    };
  }

  return {
    root: createNode({
      name: "$root",
      synthetic: true,
      value: rawTextOf(rootVal),
      jsonType: jsonTypeOf(rootVal),
    }),
  };
}
