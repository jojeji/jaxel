/**
 * DocNode is the single unified tree model for both XML and JSON documents.
 * See docs/entscheidungen.md #4 for the XML<->JSON mapping rules this type encodes.
 */

export type JsonPrimitiveType = "string" | "number" | "boolean" | "null";

export interface DocAttribute {
  name: string;
  value: string;
}

/** The fixed `name` of every comment node — chosen so `path.ts` needs no special case and the
 * result reads like the DOM convention (`catalog.#comment[0]`). Not a legal XML element name,
 * so it can never collide with a real one. */
export const COMMENT_NAME = "#comment";

/**
 * What a node stands for. Comments live in `children` at exactly the position they occupy in
 * the file (docs/entscheidungen.md, "Grilling: Kommentare in XML" #1) — anything that walks the
 * tree must therefore decide whether it means "every node" or "elements only".
 */
export type DocNodeKind = "element" | "comment";

export interface DocNode {
  /** Stable id for selection/React keys. Generated on parse or mutation, never reused. */
  id: string;
  /**
   * Element or comment. For a comment node, `value` always holds the raw text between `<!--`
   * and `-->` and is what gets written back out; `children` may ADDITIONALLY hold the parsed
   * structure when that text turned out to be well-formed XML (an "auskommentierter Teilbaum",
   * see CONTEXT.md). That is the one place where the otherwise-holding "value XOR children"
   * rule is deliberately broken — the children are a read-only view for display and search,
   * never the source of truth for serialization.
   */
  kind: DocNodeKind;
  /** Element name (XML) or property/array key (JSON); always `COMMENT_NAME` for a comment. */
  name: string;
  /** XML only; always empty for JSON-origin nodes. */
  attributes: DocAttribute[];
  /** Text/primitive content. Null when the node has children instead of a scalar value. */
  value: string | null;
  /** Only set when `value` originates from a JSON primitive, to round-trip its type (e.g. "1" vs 1 vs "1"). */
  jsonType?: JsonPrimitiveType;
  children: DocNode[];
  /**
   * Original source byte offsets [start, end) in the source file, used for minimal-invasive
   * save (unchanged nodes are copied verbatim). Absent for newly inserted or already-edited nodes.
   */
  byteRange?: [number, number];
  /** True for a virtual root Jaxel had to invent (JSON root that is a multi-key object, an array, or a primitive). */
  synthetic?: boolean;
}

let nextId = 1;

/** Generates a fresh, session-unique DocNode id. Not persisted; only stable within one document's lifetime. */
export function createNodeId(): string {
  return `n${nextId++}`;
}

export function createNode(partial: Omit<Partial<DocNode>, "id"> & { name: string }): DocNode {
  return {
    id: createNodeId(),
    kind: partial.kind ?? "element",
    name: partial.name,
    attributes: partial.attributes ?? [],
    value: partial.value ?? null,
    jsonType: partial.jsonType,
    children: partial.children ?? [],
    byteRange: partial.byteRange,
    synthetic: partial.synthetic,
  };
}

/**
 * Creates a comment node. `text` is the raw content between `<!--` and `-->`, kept verbatim —
 * it is what gets written back out. `children` is the optional parsed view of that text for an
 * auskommentierter Teilbaum (see `DocNode.kind`).
 */
export function createCommentNode(partial: {
  text: string;
  children?: DocNode[];
  byteRange?: [number, number];
}): DocNode {
  return createNode({
    kind: "comment",
    name: COMMENT_NAME,
    value: partial.text,
    children: partial.children,
    byteRange: partial.byteRange,
  });
}

/** True for a comment node. Prefer this over comparing `kind` by hand — it is the marker for
 * "this is not an element" that every tree walk has to consider. */
export function isComment(node: DocNode): boolean {
  return node.kind === "comment";
}

/** True when the comment's content parsed as well-formed XML and is shown as a tree
 * (auskommentierter Teilbaum) rather than as a single text line. */
export function isCommentedOutSubtree(node: DocNode): boolean {
  return node.kind === "comment" && node.children.length > 0;
}

/** The element children of a node, skipping comments — for everything that must see the
 * document's actual structure (JSON export, format conversion, schema-shaped paths). */
export function elementChildren(node: DocNode): DocNode[] {
  return node.children.filter((child) => child.kind !== "comment");
}

/**
 * Deep-clones a subtree for duplicate/paste: every node gets a FRESH id (ids must stay
 * unique within a document) and NO byteRange (a clone never corresponds to original
 * source bytes — a stale byteRange would make minimal-invasive save copy the wrong span).
 */
export function cloneSubtree(node: DocNode): DocNode {
  return {
    id: createNodeId(),
    kind: node.kind,
    name: node.name,
    attributes: node.attributes.map((a) => ({ ...a })),
    value: node.value,
    jsonType: node.jsonType,
    children: node.children.map((child) => cloneSubtree(child)),
    synthetic: node.synthetic,
  };
}
