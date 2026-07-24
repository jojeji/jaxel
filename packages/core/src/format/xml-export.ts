/**
 * Serializes a `DocNode` tree back to XML text.
 *
 * Two strategies, per docs/entscheidungen.md #1 (format-erhaltend, best effort —
 * kein hartes Byte-Identität-Invariant):
 * - `serializeXml`: full re-serialization from the model. Used for "save as" / brand
 *   new documents. Never reproduces comments, PIs, or CDATA markers, because
 *   `DocNode` has no slot for them (see xml-import.ts doc comment).
 * - `serializeXmlMinimal`: minimal-invasive save. A node that still carries its
 *   original `byteRange` is copied verbatim (byte-for-byte) from `source`, comments
 *   and all, because that whole span is trusted unchanged. A node without
 *   `byteRange` (new or edited) is rebuilt fresh from the model, and recursion
 *   continues into its children using the same rule.
 *
 *   Caller contract: this is a pure, per-node check — it does not detect "this
 *   node's byteRange is stale because a descendant changed". Whoever mutates the
 *   tree (the CommandBus layer) is responsible for clearing `byteRange` on every
 *   ancestor up to the root when a node changes, not just on the node itself.
 *   Consequently: a comment or other unmodeled content that sits in the *gap*
 *   between two sibling nodes (rather than nested inside one of them) is preserved
 *   only if the shared ancestor's own `byteRange` is left untouched too.
 */

import type { DocNode } from "../model/node.js";

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function serializeAttributes(node: DocNode): string {
  return node.attributes.map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join("");
}

/** Reference bytes for the minimal-invasive verbatim-copy shortcut — absent for `serializeXml`,
 * whose tree never carries a `byteRange` in the first place. */
interface ByteSource {
  bytes: Uint8Array;
  decoder: InstanceType<typeof TextDecoder>;
}

function serializeNode(node: DocNode, indent: string, depth: number, byteSource?: ByteSource): string {
  const pad = indent.repeat(depth);
  if (byteSource && node.byteRange) {
    const [start, end] = node.byteRange;
    return pad + byteSource.decoder.decode(byteSource.bytes.subarray(start, end));
  }
  const attrs = serializeAttributes(node);
  if (node.children.length > 0) {
    const inner = node.children.map((c) => serializeNode(c, indent, depth + 1, byteSource)).join("\n");
    return `${pad}<${node.name}${attrs}>\n${inner}\n${pad}</${node.name}>`;
  }
  const text = node.value ?? "";
  if (text === "") {
    return `${pad}<${node.name}${attrs}/>`;
  }
  return `${pad}<${node.name}${attrs}>${escapeText(text)}</${node.name}>`;
}

export function serializeXml(doc: { root: DocNode; xmlDeclaration?: string; indent: string }): string {
  const body = serializeNode(doc.root, doc.indent, 0);
  return doc.xmlDeclaration ? `${doc.xmlDeclaration}\n${body}\n` : `${body}\n`;
}

export function serializeXmlMinimal(
  source: string,
  doc: { root: DocNode; xmlDeclaration?: string; indent: string },
): string {
  const byteSource: ByteSource = { bytes: new TextEncoder().encode(source), decoder: new TextDecoder() };
  const body = `${serializeNode(doc.root, doc.indent, 0, byteSource)}\n`;
  return doc.xmlDeclaration ? `${doc.xmlDeclaration}\n${body}` : body;
}
