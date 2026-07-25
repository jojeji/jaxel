import type { DocFormat } from "../model/document.js";
import { cloneSubtree, createNode, type DocNode } from "../model/node.js";
import { parseXml } from "./xml-import.js";
import { parseJson } from "./json-import.js";
import { serializeXml } from "./xml-export.js";
import { serializeJson } from "./json-export.js";

/** Element name of the throw-away wrapper used to make a list of XML fragments parseable as one
 * document. Never surfaces in a result — only the wrapper's children are returned. */
const XML_WRAPPER = "jaxel-fragments";

/** A leading XML declaration belongs to a DOCUMENT, not to a fragment torn out of one; it is
 * stripped before wrapping (parseXml only accepts one at offset 0, which the wrapper would
 * displace anyway). */
const LEADING_XML_DECLARATION = /^\s*<\?xml\s[^]*?\?>/;

/**
 * Serializes several nodes as ONE clipboard payload — the multi-node counterpart of
 * `serializeDocument`, for copying a multi-selection.
 *
 * XML: the fragments simply follow one another (`<a/>\n<b/>`), which is how an XML fragment list
 * is conventionally written. JSON: the nodes become the properties of one object, so the payload
 * stays valid JSON rather than several concatenated documents — same-named siblings therefore
 * fold back into an array exactly as the mapping convention (docs/entscheidungen.md #4) demands.
 *
 * Round-trips through `parseFragments` for both formats.
 */
export function serializeFragments(format: DocFormat, nodes: DocNode[], indent: string): string {
  if (format === "xml") {
    return nodes.map((node) => serializeXml({ root: node, indent }).trimEnd()).join("\n");
  }
  // A single node is written exactly as it always was (no wrapper): wrapping it would change the
  // output for an already-synthetic node — a `$root` inside a `$root` reads as an array
  // continuation to serializeJson and would come back out as a bare array.
  if (nodes.length === 1) {
    return serializeJson({ root: nodes[0]!, indent });
  }
  return serializeJson({ root: createNode({ name: "$root", synthetic: true, children: nodes }), indent });
}

/**
 * Parses a clipboard payload as a LIST of fragments — one entry for the common single-fragment
 * case, several when the payload holds a multi-selection written by `serializeFragments`.
 *
 * Every returned node is a fresh clone: ids are regenerated (they must be unique inside the
 * target document) and byteRanges are dropped (they would point into this payload, not into the
 * target document's source — a stale byteRange makes minimal-invasive save copy the wrong span).
 *
 * Throws the underlying parser's error when the payload is not valid for `format`. Returns an
 * empty array for a payload that is well-formed but carries no insertable node.
 */
export function parseFragments(format: DocFormat, text: string): DocNode[] {
  if (format === "xml") {
    const body = text.replace(LEADING_XML_DECLARATION, "");
    const wrapped = parseXml(`<${XML_WRAPPER}>${body}</${XML_WRAPPER}>`).root;
    return wrapped.children.map((child) => cloneSubtree(child));
  }
  const { root } = parseJson(text);
  // json-import sets `synthetic` exactly when it had to invent a tree level with no direct JSON
  // counterpart — for a multi-key object (`$root`) as well as for a single key whose value
  // expanded to several nodes (`{"person": [{…}, {…}]}`, root named "person"). In both cases the
  // invented level's CHILDREN are the fragments. The children-guard keeps the one synthetic root
  // that is not a wrapper — a bare top-level primitive, which carries its value directly.
  const roots = root.synthetic && root.children.length > 0 ? root.children : [root];
  return roots.map((node) => cloneSubtree(node));
}
