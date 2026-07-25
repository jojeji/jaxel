/**
 * XML <-> JSON conversion, triggered by picking the other format's extension in "Speichern
 * unter" (docs/entscheidungen.md, "Grilling: XML/JSON-Konvertierung").
 *
 * The conversion deliberately produces *text*, not a tree: the caller writes it and re-parses
 * it through the normal `parseDocument` path. That keeps `json-import`/`xml-import` the single
 * authority on what a tree of the target format looks like — a tree built directly here would
 * be a second, silently diverging implementation of the same mapping rules.
 *
 * What crosses the format boundary (the DocNode model has no slot for the rest):
 * - XML -> JSON: attributes become `@name` properties, and an element that has attributes AND
 *   text content puts that text in a `#text` property (neither prefix can collide with a real
 *   XML name — `@` and `#` are not valid XML name characters). Values all become JSON strings;
 *   XML has no type information to derive anything else from.
 * - JSON -> XML: the reverse. Number/boolean/null types collapse to text, since XML has no way
 *   to carry them.
 * - Neither direction: comments, processing instructions and CDATA markers, which
 *   `xml-import.ts` never puts in the tree in the first place.
 *
 * Not every JSON document has an XML counterpart: JSON keys are arbitrary strings, XML element
 * names are not. Rather than silently renaming (which produces a file that looks right and
 * isn't), that case throws `InvalidXmlNameError` and the conversion is abandoned.
 */

import { createNode, type DocNode } from "../model/node.js";
import { serializeJson } from "./json-export.js";
import { serializeXml } from "./xml-export.js";

/** Property prefix for an XML attribute in JSON form (PO decision, docs/entscheidungen.md). */
const ATTRIBUTE_PREFIX = "@";
/** Property holding an element's own text when it also carries attributes. */
const TEXT_PROPERTY = "#text";
/** Element name for an XML root invented for a JSON document that has no single natural one
 * (a bare array, a primitive, or a multi-key object — `json-import`'s synthetic `$root`). */
const INVENTED_ROOT_NAME = "root";

// XML 1.0 Name production, minus the astral-plane ranges (which would need surrogate-pair
// handling for a case no real document hits).
const NAME_START =
  "A-Za-z_:\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF" +
  "\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
const NAME_CHAR = `${NAME_START}\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040`;
const XML_NAME = new RegExp(`^[${NAME_START}][${NAME_CHAR}]*$`);

/**
 * A JSON key that cannot become an XML element or attribute name. Carries the offending key
 * and its location as data rather than a finished sentence, so the UI can phrase it in the
 * user's language.
 */
export class InvalidXmlNameError extends Error {
  /** The rejected JSON key, verbatim. */
  readonly key: string;
  /** Dotted path of the key's parent, root-first (empty when the root itself is at fault). */
  readonly path: string;

  constructor(key: string, path: string) {
    super(`"${key}" is not a valid XML name${path ? ` (at ${path})` : ""}`);
    this.name = "InvalidXmlNameError";
    this.key = key;
    this.path = path;
  }
}

/** True if `name` may be used verbatim as an XML element or attribute name. */
export function isValidXmlName(name: string): boolean {
  return XML_NAME.test(name);
}

export interface ConvertParams {
  /** Target format — the source format follows from the tree itself. */
  to: "xml" | "json";
  root: DocNode;
  /** e.g. "  " or "\t"; carried over from the source document. */
  indent: string;
  /** XML only, for the generated declaration. Defaults to UTF-8. */
  encoding?: string;
}

/**
 * Converts a parsed document to text in the other format. Throws `InvalidXmlNameError` when
 * converting to XML and some JSON key cannot be an XML name — nothing is written in that case.
 */
export function convertDocument(params: ConvertParams): string {
  if (params.to === "json") {
    return serializeJson({ root: toJsonShape(params.root), indent: params.indent });
  }
  return serializeXml({
    root: toXmlShape(params.root, []),
    xmlDeclaration: `<?xml version="1.0" encoding="${params.encoding ?? "UTF-8"}"?>`,
    indent: params.indent,
  });
}

// --- XML -> JSON ---------------------------------------------------------------------------

/**
 * Rewrites an XML-origin node into the shape `json-export` expects: attributes become leading
 * `@name` children, and text that would otherwise be crowded out by them moves into `#text`.
 * Every value is typed as a JSON string — XML carries no type information, and guessing
 * ("42" -> number) would change data the user never asked to change.
 */
function toJsonShape(node: DocNode): DocNode {
  const attributeNodes = node.attributes.map((attribute) =>
    createNode({
      name: ATTRIBUTE_PREFIX + attribute.name,
      value: attribute.value,
      jsonType: "string",
    }),
  );

  if (attributeNodes.length === 0) {
    return createNode({
      name: node.name,
      value: node.value,
      jsonType: node.value === null ? undefined : "string",
      children: node.children.map(toJsonShape),
      synthetic: node.synthetic,
    });
  }

  // With attributes present the node must become a JSON object, so its own text (if any) needs
  // a property of its own — `value` and `children` are mutually exclusive in DocNode. Empty
  // text is left out entirely: `xml-import` gives `<a x="1"/>` an empty string value, and a
  // `"#text": ""` carrying no information would still round-trip back to the same `<a x="1"/>`.
  const textNodes =
    node.value === null || node.value === ""
      ? []
      : [createNode({ name: TEXT_PROPERTY, value: node.value, jsonType: "string" })];
  return createNode({
    name: node.name,
    children: [...attributeNodes, ...textNodes, ...node.children.map(toJsonShape)],
    synthetic: node.synthetic,
  });
}

// --- JSON -> XML ---------------------------------------------------------------------------

/**
 * Rewrites a JSON-origin node into XML shape, undoing `toJsonShape`: `@name` leaves become
 * attributes, a `#text` leaf becomes the element's text.
 *
 * Both only apply where XML can actually represent the result. A `@name` property whose value
 * is an object, or a `#text` alongside real element children (which XML could only express as
 * mixed content, and DocNode not at all), stays an ordinary child — and then fails the name
 * check below, which is the honest outcome: that document has no XML form.
 */
function toXmlShape(node: DocNode, ancestorNames: string[]): DocNode {
  // `json-import` invents the name `$root` for a bare array/primitive/multi-key root — and for
  // an array root it propagates that name down to every element too, so this rename cannot be
  // limited to the root node. `$` is not a valid XML name character, so replacing rather than
  // rejecting is safe: the name is one Jaxel invented, never one the user chose. A JSON
  // document that really does use the key "$root" also lands here, which beats failing on it.
  const name = node.name === "$root" ? INVENTED_ROOT_NAME : node.name;
  const path = ancestorNames.join(".");
  if (!isValidXmlName(name)) throw new InvalidXmlNameError(node.name, path);

  const attributes: Array<{ name: string; value: string }> = [];
  const elementChildren: DocNode[] = [];
  let text: string | null = node.value;

  const textCandidate = node.children.find((child) => child.name === TEXT_PROPERTY && isLeaf(child));
  const hasElementSiblings = node.children.some(
    (child) => child !== textCandidate && !isAttributeCandidate(child),
  );

  for (const child of node.children) {
    if (isAttributeCandidate(child)) {
      const attributeName = child.name.slice(ATTRIBUTE_PREFIX.length);
      if (!isValidXmlName(attributeName)) throw new InvalidXmlNameError(child.name, joinPath(path, name));
      attributes.push({ name: attributeName, value: child.value ?? "" });
      continue;
    }
    if (child === textCandidate && !hasElementSiblings) {
      text = child.value ?? "";
      continue;
    }
    elementChildren.push(toXmlShape(child, [...ancestorNames, name]));
  }

  return createNode({
    name,
    attributes,
    value: elementChildren.length > 0 ? null : text,
    children: elementChildren,
  });
}

function isLeaf(node: DocNode): boolean {
  return node.children.length === 0;
}

function isAttributeCandidate(node: DocNode): boolean {
  return node.name.startsWith(ATTRIBUTE_PREFIX) && node.name.length > 1 && isLeaf(node) && node.value !== null;
}

function joinPath(path: string, name: string): string {
  return path ? `${path}.${name}` : name;
}
