import type { DocNode } from "./node.js";

export type DocFormat = "xml" | "json";

/**
 * The verbatim text around an XML document's root element. None of it is representable as tree
 * nodes (a document has exactly one root, and `DocNode` has no type for DOCTYPE, comments or
 * processing instructions), so it is carried along as raw source and written back unchanged.
 *
 * Kept as one interface rather than three loose fields because they are always captured and
 * restored together — a save path that handles only some of them silently drops the rest, which
 * is exactly the bug this exists to fix.
 */
export interface XmlFraming {
  /** Raw `<?xml ...?>` declaration text, if the document had one. */
  xmlDeclaration?: string;
  /** Everything between the declaration and the root tag — DOCTYPE, comments, processing
   * instructions, and the whitespace around them. Undefined for a tree that never came from
   * parsed source; an empty string means "there genuinely was nothing here". */
  prolog?: string;
  /** Everything after the closing root tag, including the file's final newline. */
  epilog?: string;
}

export interface JaxelDocument extends XmlFraming {
  format: DocFormat;
  root: DocNode;
  /** e.g. "UTF-8", "ISO-8859-1". Preserved on save unless the user explicitly changes it. */
  encoding: string;
  /** Indentation used when serializing new or edited nodes, e.g. "  " or "\t". */
  indent: string;
  /** Bumped by the CommandBus on every executed/undone/redone command; drives React re-render. */
  revision: number;
}

export function createDocument(
  partial: {
    format: DocFormat;
    root: DocNode;
    encoding?: string;
    indent?: string;
  } & XmlFraming,
): JaxelDocument {
  return {
    format: partial.format,
    root: partial.root,
    encoding: partial.encoding ?? "UTF-8",
    indent: partial.indent ?? "  ",
    xmlDeclaration: partial.xmlDeclaration,
    prolog: partial.prolog,
    epilog: partial.epilog,
    revision: 0,
  };
}
