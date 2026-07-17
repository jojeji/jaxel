import type { DocNode } from "./node.js";

export type DocFormat = "xml" | "json";

export interface JaxelDocument {
  format: DocFormat;
  root: DocNode;
  /** e.g. "UTF-8", "ISO-8859-1". Preserved on save unless the user explicitly changes it. */
  encoding: string;
  /** Indentation used when serializing new or edited nodes, e.g. "  " or "\t". */
  indent: string;
  /** Raw `<?xml ...?>` prolog text (XML only), preserved verbatim if present. */
  xmlDeclaration?: string;
  /** Bumped by the CommandBus on every executed/undone/redone command; drives React re-render. */
  revision: number;
}

export function createDocument(partial: {
  format: DocFormat;
  root: DocNode;
  encoding?: string;
  indent?: string;
  xmlDeclaration?: string;
}): JaxelDocument {
  return {
    format: partial.format,
    root: partial.root,
    encoding: partial.encoding ?? "UTF-8",
    indent: partial.indent ?? "  ",
    xmlDeclaration: partial.xmlDeclaration,
    revision: 0,
  };
}
