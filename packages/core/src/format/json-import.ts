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

/** `at`: offset of the value's first character in the source (for `jsonSourceOffsets`). */
type JObject = { kind: "object"; entries: Array<[key: string, value: JVal, keyAt: number]>; at: number };
type JArray = { kind: "array"; items: JVal[]; at: number };
type JString = { kind: "string"; text: string; at: number };
type JNumber = { kind: "number"; raw: string; at: number };
type JBoolean = { kind: "boolean"; value: boolean; at: number };
type JNull = { kind: "null"; at: number };
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
    const at = i;
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return { kind: "string", text: parseStringRaw(), at };
    if (c === "t") {
      expectLiteral("true");
      return { kind: "boolean", value: true, at };
    }
    if (c === "f") {
      expectLiteral("false");
      return { kind: "boolean", value: false, at };
    }
    if (c === "n") {
      expectLiteral("null");
      return { kind: "null", at };
    }
    if (c === "-" || isDigit(c)) return parseNumber();
    fail(`Unexpected token '${c ?? "<eof>"}'`);
  }

  function parseObject(): JObject {
    const at = i;
    i++; // consume '{'
    const entries: Array<[string, JVal, number]> = [];
    skipWs();
    if (source[i] === "}") {
      i++;
      return { kind: "object", entries, at };
    }
    for (;;) {
      skipWs();
      if (source[i] !== '"') fail("Expected string key");
      const keyAt = i;
      const key = parseStringRaw();
      skipWs();
      if (source[i] !== ":") fail("Expected ':'");
      i++;
      const value = parseValue();
      entries.push([key, value, keyAt]);
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
    return { kind: "object", entries, at };
  }

  function parseArray(): JArray {
    const at = i;
    i++; // consume '['
    const items: JVal[] = [];
    skipWs();
    if (source[i] === "]") {
      i++;
      return { kind: "array", items, at };
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
    return { kind: "array", items, at };
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
    return { kind: "number", raw: source.slice(start, i), at: start };
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

/** Notes where in the source a node starts — a no-op unless `jsonSourceOffsets` asks. */
type Record = (node: DocNode, at: number) => DocNode;
const noRecord: Record = (node) => node;

function primitiveNode(name: string, val: JString | JNumber | JBoolean | JNull, at: number, record: Record): DocNode {
  return record(createNode({ name, value: rawTextOf(val), jsonType: jsonTypeOf(val) }), at);
}

/** Rule 1: object -> one node with one child per property, in source order. */
function objectToNode(name: string, val: JObject, at: number, record: Record): DocNode {
  return record(
    createNode({
      name,
      children: val.entries.flatMap(([key, value, keyAt]) => propertyToNodes(key, value, keyAt, record)),
    }),
    at,
  );
}

/**
 * A single array element. Rule 3: object element -> its own child nodes (rule 1). Rule 4: array
 * element that is itself an array -> the name propagates one level further down. Rule 5:
 * primitive element -> a leaf node.
 */
function arrayElementToNode(name: string, val: JVal, record: Record): DocNode {
  if (val.kind === "object") return objectToNode(name, val, val.at, record);
  if (val.kind === "array") {
    return record(
      createNode({ name, jsonArray: true, children: val.items.map((item) => arrayElementToNode(name, item, record)) }),
      val.at,
    );
  }
  return primitiveNode(name, val, val.at, record);
}

/**
 * The node(s) a single object property expands to. Rule 2/3: an array value produces several
 * same-named sibling nodes (one per element) instead of a single wrapper node. Rule 1/5: object
 * and primitive values produce exactly one node — it starts at its key (`keyAt`).
 */
function propertyToNodes(name: string, val: JVal, keyAt: number, record: Record): DocNode[] {
  if (val.kind === "array") return val.items.map((item) => arrayElementToNode(name, item, record));
  if (val.kind === "object") return [objectToNode(name, val, keyAt, record)];
  return [primitiveNode(name, val, keyAt, record)];
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
  return { root: buildRoot(parseJsonSource(source), noRecord) };
}

/**
 * Where each node of `parseJson(source)`'s tree starts in `source` (character offset): a
 * property's node at its key, an array element at its value, an invented root at 0. Used to
 * find a node in the source view; same tree shape as `parseJson`, built by the same code.
 */
export function jsonSourceOffsets(source: string): { root: DocNode; offsets: Map<DocNode, number> } {
  const offsets = new Map<DocNode, number>();
  const root = buildRoot(parseJsonSource(source), (node, at) => {
    offsets.set(node, at);
    return node;
  });
  if (!offsets.has(root)) offsets.set(root, 0);
  return { root, offsets };
}

function buildRoot(rootVal: JVal, record: Record): DocNode {
  if (rootVal.kind === "object") {
    if (rootVal.entries.length === 1) {
      const [key, value, keyAt] = rootVal.entries[0]!;
      const nodes = propertyToNodes(key, value, keyAt, record);
      if (nodes.length === 1) {
        return nodes[0]!;
      }
      // `nodes` is not exactly one node only for an array value (empty or several elements).
      return createNode({ name: key, synthetic: true, jsonArray: true, children: nodes });
    }
    return createNode({
      name: "$root",
      synthetic: true,
      children: rootVal.entries.flatMap(([key, value, keyAt]) => propertyToNodes(key, value, keyAt, record)),
    });
  }

  if (rootVal.kind === "array") {
    return createNode({
      name: "$root",
      synthetic: true,
      jsonArray: true,
      children: rootVal.items.map((item) => arrayElementToNode("$root", item, record)),
    });
  }

  return createNode({
    name: "$root",
    synthetic: true,
    value: rawTextOf(rootVal),
    jsonType: jsonTypeOf(rootVal),
  });
}
