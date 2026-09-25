import type { DocNode } from "../model/node.js";

/**
 * `serializeXmlMinimal` (see ../format/xml-export.ts) copies a node verbatim from source
 * bytes whenever it still has a `byteRange`, WITHOUT recursing into its children — an
 * ancestor's byteRange means "nothing under here changed". So whenever a node's own
 * content changes, every ancestor up to the root must have its byteRange cleared too,
 * or the edit would be silently dropped on minimal-invasive save.
 *
 * `chain` is expected as [...ancestors, node] (root first, the changed node last).
 *
 * These are pure primitives, deliberately not commands-specific: CommandBus is the
 * ONLY caller (see command-bus.ts) — it owns capturing/clearing/restoring for every
 * command's `byteRangeChain`, including the save-epoch check that decides whether a
 * restore is still safe. Individual commands (rename.ts, set-value.ts, ...) only declare
 * their chain; they no longer call these themselves.
 */

export function captureByteRanges(chain: DocNode[]): DocNode["byteRange"][] {
  return chain.map((node) => node.byteRange);
}

export function clearByteRanges(chain: DocNode[]): void {
  for (const node of chain) node.byteRange = undefined;
}

export function restoreByteRanges(chain: DocNode[], saved: DocNode["byteRange"][]): void {
  chain.forEach((node, i) => {
    node.byteRange = saved[i];
  });
}

/**
 * After `serializeXmlMinimal` writes a document to disk, that file becomes the byte
 * source for the *next* minimal-invasive save. If the caller only swaps in the new
 * source text without also refreshing every node's `byteRange` to match it, any node
 * whose `byteRange` still points at the OLD source silently reads the wrong bytes from
 * the new one the moment an earlier edit shifted its offset — corrupting the second
 * save (see docs/entscheidungen.md, "Byte-Offsets nach dem Speichern auffrischen").
 *
 * `fresh` must be `existing`'s just-written output re-parsed — since it's a
 * re-serialization of `existing` itself, the two trees are guaranteed structurally
 * identical (same nodes, same order), so byteRanges can be copied over by tree
 * position. `existing`'s node objects (and therefore ids and undo/redo history) are
 * left untouched — only the `byteRange` field is refreshed.
 */
export function syncByteRangesAfterSave(existing: DocNode, fresh: DocNode): void {
  // "Guaranteed structurally identical" is the contract, but a model that serializes to
  // something that parses differently must not leave half the tree synced to the new text and
  // half to the old one (or throw half way): drop every range instead — the next save then
  // rebuilds from the model, which is always safe.
  if (!sameShape(existing, fresh)) {
    stripByteRanges(existing);
    return;
  }
  copyByteRanges(existing, fresh);
}

function sameShape(a: DocNode, b: DocNode): boolean {
  if (a.kind !== b.kind || a.name !== b.name || a.children.length !== b.children.length) return false;
  return a.children.every((child, i) => sameShape(child, b.children[i]!));
}

function copyByteRanges(existing: DocNode, fresh: DocNode): void {
  existing.byteRange = fresh.byteRange;
  existing.children.forEach((child, i) => copyByteRanges(child, fresh.children[i]!));
}

/** Clears the byteRange of `node` and its whole subtree. */
export function stripByteRanges(node: DocNode): void {
  node.byteRange = undefined;
  for (const child of node.children) stripByteRanges(child);
}
