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
