import type { DocFormat } from "../model/document.js";
import type { DocNode } from "../model/node.js";
import { parseXml } from "./xml-import.js";
import { parseJson } from "./json-import.js";
import { serializeXml } from "./xml-export.js";
import { serializeJson } from "./json-export.js";

export interface ParsedDocument {
  root: DocNode;
  /** XML only — a JSON-origin document never has one. */
  xmlDeclaration?: string;
}

/**
 * Parses `text` as `format`, dispatching to the right parser — the shape every
 * format-agnostic caller (open/new/reload/paste) actually wants, instead of re-writing the
 * `format === "xml" ? ... : ...` branch at each call site.
 */
export function parseDocument(format: DocFormat, text: string): ParsedDocument {
  if (format === "xml") {
    const parsed = parseXml(text);
    return { root: parsed.root, xmlDeclaration: parsed.xmlDeclaration };
  }
  return { root: parseJson(text).root };
}

/**
 * Full (non-minimal-invasive) serialization, dispatching on `format` — for contexts with no
 * "original source bytes" to preserve unchanged spans from (e.g. copying a subtree to the
 * clipboard). The save path's minimal-invasive XML serialization stays separate (it needs a
 * `source` string this shape has no room for) — see document-store.ts's `serializeForSave`.
 */
export function serializeDocument(doc: {
  format: DocFormat;
  root: DocNode;
  xmlDeclaration?: string;
  indent: string;
}): string {
  return doc.format === "xml"
    ? serializeXml({ root: doc.root, xmlDeclaration: doc.xmlDeclaration, indent: doc.indent })
    : serializeJson({ root: doc.root, indent: doc.indent });
}
