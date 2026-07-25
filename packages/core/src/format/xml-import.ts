/**
 * Hand-rolled XML parser: turns well-formed XML source text into a `DocNode` tree
 * (see `packages/core/src/model/node.ts`). No npm dependency — packages/core has no
 * runtime dependencies by design (see AGENTS.md).
 *
 * Implementation notes:
 * - Uses a single forward-moving character cursor (never re-scans from position 0),
 *   so parsing a document with tens of thousands of elements stays roughly linear
 *   instead of degrading into repeated-`indexOf`-from-start quadratic behavior.
 * - `byteRange` on every node is computed in UTF-8 *bytes*, not UTF-16 code units,
 *   via a precomputed char-index -> byte-offset table built once with `TextEncoder`
 *   (see `buildByteOffsetTable`). This matters for any source containing multi-byte
 *   characters (e.g. "ä", "€") before or inside an element.
 *
 * Known V1 limitations (deliberately not solved here, see docs/entscheidungen.md):
 * - True mixed content (non-whitespace text interleaved with child elements) is not
 *   representable in `DocNode` (no text-child node type in V1). Such stray text is
 *   silently dropped once an element is found to have child elements. Pure
 *   whitespace between child elements is dropped too (not treated as content).
 * - Comments, processing instructions (other than the leading XML declaration) and
 *   the CDATA *markers* are not represented as tree nodes — the model has no slot
 *   for them. Inside the root element they are parsed (so they can't crash the parser
 *   or corrupt byte offsets) and then discarded, except CDATA *content*, which is kept
 *   as raw, non-entity-decoded text. Such content survives a save only indirectly, via
 *   the minimal-invasive path's verbatim byte copy of unchanged nodes.
 *   OUTSIDE the root element (prolog/epilog) the same content is kept verbatim as raw
 *   text instead, because there is no enclosing node whose byte range could carry it —
 *   discarding it meant a plain open-and-save silently dropped the DOCTYPE and every
 *   comment above the root.
 * - Namespace prefixes are treated as plain text within `name`/attribute `name`;
 *   there is no prefix-to-`xmlns`-URI resolution (per docs/entscheidungen.md #6).
 * - Unknown named entities (i.e. anything beyond the five XML-predefined entities
 *   and numeric character references) would require DTD support we don't have;
 *   they are left untouched verbatim rather than rejected or resolved.
 */

import { createCommentNode, createNode, type DocAttribute, type DocNode } from "../model/node.js";

export interface ParseXmlResult {
  root: DocNode;
  xmlDeclaration?: string;
  /** Raw text between the XML declaration and the root tag (DOCTYPE, comments, processing
   * instructions, and the whitespace around them), kept verbatim so saving can restore it. */
  prolog?: string;
  /** Raw text after the closing root tag, same deal — including the file's final newline. */
  epilog?: string;
}

// Permissive Unicode allowance beyond the ASCII XML Name grammar (covers accented
// letters etc. in real-world tag/attribute names) without implementing the full
// XML Name production.
const NAME_START = /[A-Za-z_:À-￿]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-À-￿]/;
const WHITESPACE = /\s/;
const ENTITY_RE = /&(#[xX][0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g;

/** Decodes the five XML-predefined entities plus numeric character references. */
function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (match, body: string) => {
    switch (body) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
    }
  });
}

/**
 * Builds a char-index -> UTF-8-byte-offset lookup table for `source`.
 *
 * Two things matter for documents in the "several hundred MB" range this parser is
 * meant to handle (see docs/entscheidungen.md #3):
 *
 * 1. **Storage**: a plain `Array` (`new Array(n)`), even pre-sized, hits a real V8
 *    limit around ~11M sequential writes on a large declared length — filling it
 *    throws `RangeError: Invalid array length` well before reaching the end (verified
 *    empirically against a 184 MB / ~193M-character fixture; unrelated to available
 *    heap size). A `Uint32Array` has no such holey/packed transition and is also far
 *    more memory-compact (4 bytes/entry vs. a boxed-number Array). Byte offsets are
 *    assumed to stay under 2^32 (~4.29 GB) — comfortably true for anything in scope
 *    (see docs/entscheidungen.md: no >RAM editing).
 * 2. **Speed**: computing each character's UTF-8 byte length via `TextEncoder.encode()`
 *    per code point (one object allocation per character) does not finish in a
 *    reasonable time on a document with ~190M characters. UTF-8 byte length per UTF-16
 *    code unit/surrogate pair is a small, well-known arithmetic rule — computing it
 *    directly avoids that allocation entirely and brought table construction from
 *    "did not complete in 60s" down to under 1s on the same fixture.
 */
function buildByteOffsetTable(source: string): Uint32Array {
  const len = source.length;
  const table = new Uint32Array(len + 1);
  let byteOffset = 0;
  let i = 0;
  while (i < len) {
    const code = source.charCodeAt(i);
    table[i] = byteOffset;
    let charBytes: number;
    let advance = 1;
    if (code < 0x80) {
      charBytes = 1;
    } else if (code < 0x800) {
      charBytes = 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < len) {
      const next = source.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        // Valid surrogate pair: one astral code point, 4 UTF-8 bytes, consumes 2 UTF-16 units.
        // Mid-surrogate index is never queried by the parser (all cursor positions land on
        // token boundaries, which are always ASCII), so an approximate value here is harmless.
        charBytes = 4;
        advance = 2;
        table[i + 1] = byteOffset;
      } else {
        charBytes = 3; // Lone high surrogate: encoded as the replacement character (3 bytes).
      }
    } else {
      charBytes = 3;
    }
    byteOffset += charBytes;
    i += advance;
  }
  table[len] = byteOffset;
  return table;
}

/** Wrapper element name for the fragment parse below — never surfaces anywhere. */
const COMMENT_PROBE_WRAPPER = "jaxel-comment-probe";

/**
 * Decides whether a comment's text is commented-out markup rather than prose, and returns the
 * parsed structure if so (see CONTEXT.md, "Auskommentierter Teilbaum"). Nothing marks this in
 * the file — the parse attempt IS the test.
 *
 * The cheap `<`/`>` guard matters: a document can hold millions of prose comments, and without
 * it each one would pay for a throwaway parser run. Byte ranges from the inner parse are
 * dropped because they are offsets into the comment text, not into the file — leaving them
 * would let the minimal-invasive save copy from entirely wrong positions.
 */
function parseCommentedOutSubtree(text: string): DocNode[] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) return undefined;
  try {
    const wrapped = parseXml(`<${COMMENT_PROBE_WRAPPER}>${trimmed}</${COMMENT_PROBE_WRAPPER}>`);
    const children = wrapped.root.children;
    if (children.length === 0) return undefined;
    for (const child of children) stripByteRanges(child);
    return children;
  } catch {
    return undefined; // ordinary prose that merely looks like markup
  }
}

function stripByteRanges(node: DocNode): void {
  node.byteRange = undefined;
  for (const child of node.children) stripByteRanges(child);
}

export function parseXml(source: string): ParseXmlResult {
  const len = source.length;
  const byteAt = buildByteOffsetTable(source);

  function fail(message: string, at: number): never {
    const line = source.slice(0, at).split("\n").length;
    throw new Error(`XML parse error at line ${line}: ${message}`);
  }

  function peekAt(needle: string, at: number): boolean {
    return source.startsWith(needle, at);
  }

  function skipWhitespace(p: number): number {
    let i = p;
    while (i < len && WHITESPACE.test(source.charAt(i))) i++;
    return i;
  }

  function skipDoctype(p: number): number {
    // "<!DOCTYPE".length === 9
    let i = p + 9;
    let depth = 0;
    let quote: string | null = null;
    for (; i < len; i++) {
      const c = source.charAt(i);
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
      } else if (c === "[") {
        depth++;
      } else if (c === "]") {
        depth--;
      } else if (c === ">" && depth <= 0) {
        return i + 1;
      }
    }
    fail("unterminated DOCTYPE declaration", p);
  }

  function skipMisc(p: number): number {
    let i = p;
    for (;;) {
      i = skipWhitespace(i);
      if (peekAt("<!--", i)) {
        const end = source.indexOf("-->", i + 4);
        if (end === -1) fail("unterminated comment", i);
        i = end + 3;
        continue;
      }
      if (peekAt("<!DOCTYPE", i) || peekAt("<!doctype", i)) {
        i = skipDoctype(i);
        continue;
      }
      if (peekAt("<?", i)) {
        const end = source.indexOf("?>", i + 2);
        if (end === -1) fail("unterminated processing instruction", i);
        i = end + 2;
        continue;
      }
      break;
    }
    return i;
  }

  function parseName(p: number, what: string): { name: string; end: number } {
    if (!NAME_START.test(source.charAt(p))) fail(`expected ${what}`, p);
    let i = p + 1;
    while (i < len && NAME_CHAR.test(source.charAt(i))) i++;
    return { name: source.slice(p, i), end: i };
  }

  function parseAttributes(p: number): { attributes: DocAttribute[]; end: number } {
    const attributes: DocAttribute[] = [];
    let i = p;
    for (;;) {
      const beforeWs = i;
      i = skipWhitespace(i);
      const c = source.charAt(i);
      if (c === "/" || c === ">") break;
      if (i >= len) fail("unexpected end of input in start tag", i);
      if (i === beforeWs) fail("expected whitespace before attribute", i);
      const { name: attrName, end: nameEnd } = parseName(i, "attribute name");
      i = skipWhitespace(nameEnd);
      if (source.charAt(i) !== "=") fail(`expected '=' after attribute name "${attrName}"`, i);
      i = skipWhitespace(i + 1);
      const quote = source.charAt(i);
      if (quote !== '"' && quote !== "'") fail("expected quoted attribute value", i);
      const valueStart = i + 1;
      const closeQuote = source.indexOf(quote, valueStart);
      if (closeQuote === -1) fail(`unterminated attribute value for "${attrName}"`, i);
      attributes.push({ name: attrName, value: decodeEntities(source.slice(valueStart, closeQuote)) });
      i = closeQuote + 1;
    }
    return { attributes, end: i };
  }

  function parseElement(start: number): { node: DocNode; end: number } {
    if (source.charAt(start) !== "<") fail("expected '<'", start);
    const { name, end: nameEnd } = parseName(start + 1, "element name");
    const { attributes, end: attrEnd } = parseAttributes(nameEnd);
    let p = attrEnd;

    if (source.charAt(p) === "/") {
      if (source.charAt(p + 1) !== ">") fail("expected '>' after '/'", p + 1);
      p += 2;
      const node = createNode({
        name,
        attributes,
        value: "",
        children: [],
        byteRange: [byteAt[start]!, byteAt[p]!],
      });
      return { node, end: p };
    }
    if (source.charAt(p) !== ">") fail("expected '>' to close start tag", p);
    p += 1;

    const children: DocNode[] = [];
    let text = "";

    for (;;) {
      if (p >= len) fail(`unexpected end of input, unclosed element "${name}"`, p);
      if (peekAt("</", p)) {
        const closeTagStart = p;
        const { name: closeName, end: closeNameEnd } = parseName(p + 2, "closing tag name");
        const afterWs = skipWhitespace(closeNameEnd);
        if (source.charAt(afterWs) !== ">") fail(`expected '>' to close end tag "</${closeName}>"`, afterWs);
        const endPos = afterWs + 1;
        if (closeName !== name) {
          fail(`mismatched closing tag: expected "</${name}>" but found "</${closeName}>"`, closeTagStart);
        }
        // Comments alone must not turn a text-carrying element into a container: `<a>x<!--c--></a>`
        // still has the value "x". Where both appear, the text wins and the comment is dropped —
        // the same mixed-content limit this parser already applies to stray text.
        const byteRange: [number, number] = [byteAt[start]!, byteAt[endPos]!];
        const hasElementChildren = children.some((child) => child.kind === "element");
        const keepsComments = hasElementChildren || text.trim() === "";
        const node =
          hasElementChildren || (keepsComments && children.length > 0)
            ? createNode({ name, attributes, value: null, children, byteRange })
            : createNode({ name, attributes, value: text, children: [], byteRange });
        return { node, end: endPos };
      }
      if (peekAt("<!--", p)) {
        const end = source.indexOf("-->", p + 4);
        if (end === -1) fail("unterminated comment", p);
        children.push(
          createCommentNode({
            text: source.slice(p + 4, end),
            children: parseCommentedOutSubtree(source.slice(p + 4, end)),
            byteRange: [byteAt[p]!, byteAt[end + 3]!],
          }),
        );
        p = end + 3;
        continue;
      }
      if (peekAt("<![CDATA[", p)) {
        const end = source.indexOf("]]>", p + 9);
        if (end === -1) fail("unterminated CDATA section", p);
        text += source.slice(p + 9, end); // raw content, no entity decoding inside CDATA
        p = end + 3;
        continue;
      }
      if (peekAt("<?", p)) {
        const end = source.indexOf("?>", p + 2);
        if (end === -1) fail("unterminated processing instruction", p);
        p = end + 2;
        continue;
      }
      if (source.charAt(p) === "<") {
        // Known limitation: true mixed content (non-whitespace text alongside child
        // elements) is dropped here rather than modeled — see module doc comment.
        text = "";
        const { node: child, end: childEnd } = parseElement(p);
        children.push(child);
        p = childEnd;
        continue;
      }
      const next = source.indexOf("<", p);
      const stop = next === -1 ? len : next;
      text += decodeEntities(source.slice(p, stop));
      p = stop;
    }
  }

  let pos = 0;
  let xmlDeclaration: string | undefined;
  if (peekAt("<?xml", 0)) {
    const afterTarget = source.charAt(5);
    if (WHITESPACE.test(afterTarget) || peekAt("?>", 5)) {
      const end = source.indexOf("?>", 5);
      if (end === -1) fail("unterminated XML declaration", 0);
      xmlDeclaration = source.slice(0, end + 2);
      pos = end + 2;
    }
  }

  // Everything between the declaration and the root tag — DOCTYPE, comments, processing
  // instructions — is kept VERBATIM (whitespace and line breaks included) rather than modeled.
  // `skipMisc` used to discard it, which meant merely opening and saving a file dropped its
  // DOCTYPE and any leading comments. Keeping the raw span makes saving give it back unchanged
  // without the tree needing a node type for any of it.
  const prologStart = pos;
  pos = skipMisc(pos);
  const prolog = source.slice(prologStart, pos);
  if (pos >= len || source.charAt(pos) !== "<") {
    fail("expected root element", pos);
  }
  const { node: root, end: rootEnd } = parseElement(pos);
  // Same for anything after the closing root tag (trailing comments, the final newline).
  const epilog = source.slice(rootEnd);
  return { root, xmlDeclaration, prolog, epilog };
}
