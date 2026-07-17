/**
 * DocNode is the single unified tree model for both XML and JSON documents.
 * See docs/entscheidungen.md #4 for the XML<->JSON mapping rules this type encodes.
 */

export type JsonPrimitiveType = "string" | "number" | "boolean" | "null";

export interface DocAttribute {
  name: string;
  value: string;
}

export interface DocNode {
  /** Stable id for selection/React keys. Generated on parse or mutation, never reused. */
  id: string;
  /** Element name (XML) or property/array key (JSON). */
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
 * Deep-clones a subtree for duplicate/paste: every node gets a FRESH id (ids must stay
 * unique within a document) and NO byteRange (a clone never corresponds to original
 * source bytes — a stale byteRange would make minimal-invasive save copy the wrong span).
 */
export function cloneSubtree(node: DocNode): DocNode {
  return {
    id: createNodeId(),
    name: node.name,
    attributes: node.attributes.map((a) => ({ ...a })),
    value: node.value,
    jsonType: node.jsonType,
    children: node.children.map((child) => cloneSubtree(child)),
    synthetic: node.synthetic,
  };
}
