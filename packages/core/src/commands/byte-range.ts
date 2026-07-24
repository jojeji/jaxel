import type { DocNode } from "../model/node.js";

/**
 * `serializeXmlMinimal` (see ../format/xml-export.ts) copies a node verbatim from source
 * bytes whenever it still has a `byteRange`, WITHOUT recursing into its children — an
 * ancestor's byteRange means "nothing under here changed". So whenever a node's own
 * content changes, every ancestor up to the root must have its byteRange cleared too,
 * or the edit would be silently dropped on minimal-invasive save.
 *
 * `chain` is expected as [...ancestors, node] (root first, the changed node last).
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
  existing.byteRange = fresh.byteRange;
  for (let i = 0; i < existing.children.length; i++) {
    syncByteRangesAfterSave(existing.children[i]!, fresh.children[i]!);
  }
}
