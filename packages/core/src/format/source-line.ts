/**
 * Where a node starts in a document's text — for the source view (Quelltextansicht, CONTEXT.md),
 * which jumps to the node selected in the tree.
 *
 * The text is what saving writes, so it is parsed again and the node is found at the same
 * position in the fresh tree (`path`: child indices from the root). That holds because saving and
 * parsing round-trip the tree's shape — the same guarantee `syncByteRangesAfterSave` relies on.
 * When the node cannot be found (a stale path, text that no longer parses), the nearest ancestor
 * that can be found is used, down to line 0.
 */

import type { DocFormat } from "../model/document.js";
import type { DocNode } from "../model/node.js";
import { parseXml } from "./xml-import.js";
import { jsonSourceOffsets } from "./json-import.js";

export interface SourceLineQuery {
  format: DocFormat;
  text: string;
  /** Child indices from the root of `text`'s tree to the node. Empty: the root itself. */
  path: number[];
  /** XML only: a tree whose byteRanges already index into `text` (an unchanged document whose
   * text is its source) — spares parsing `text` again. */
  rangesFrom?: DocNode;
}

/** 0-based line of the node's first character in `text`. */
export function sourceLineOf(query: SourceLineQuery): number {
  try {
    return query.format === "xml" ? xmlLine(query) : jsonLine(query);
  } catch {
    return 0; // text that does not parse: nothing to find
  }
}

function xmlLine({ text, path, rangesFrom }: SourceLineQuery): number {
  const root = rangesFrom ?? parseXml(text).root;
  let byteOffset = root.byteRange?.[0] ?? 0;
  let node = root;
  for (const index of path) {
    const child = node.children[index];
    // Nodes inside a commented-out subtree have no range of their own (they live in the
    // comment's text), so the comment's line is as close as it gets.
    if (!child?.byteRange) break;
    node = child;
    byteOffset = child.byteRange[0];
  }
  return newlinesBefore(new TextEncoder().encode(text), byteOffset);
}

function jsonLine({ text, path }: SourceLineQuery): number {
  const { root, offsets } = jsonSourceOffsets(text);
  let node = root;
  for (const index of path) {
    const child = node.children[index];
    if (!child) break;
    node = child;
  }
  const at = offsets.get(node) ?? 0;
  let line = 0;
  for (let i = text.indexOf("\n"); i !== -1 && i < at; i = text.indexOf("\n", i + 1)) line++;
  return line;
}

/** Newline bytes before `end` — 0x0A never occurs inside a multi-byte UTF-8 sequence. */
function newlinesBefore(bytes: Uint8Array, end: number): number {
  let line = 0;
  for (let i = bytes.indexOf(0x0a); i !== -1 && i < end; i = bytes.indexOf(0x0a, i + 1)) line++;
  return line;
}
