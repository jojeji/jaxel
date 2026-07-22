import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml, serializeXmlMinimal } from "../src/format/xml-export.js";
import { createNode } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";

/** Strips ids/byteRange so two trees can be compared structurally. */
function strip(node: DocNode): unknown {
  return {
    name: node.name,
    attributes: node.attributes,
    value: node.value,
    children: node.children.map(strip),
  };
}

describe("parseXml", () => {
  it("parses a simple element with an attribute and nested text", () => {
    const { root } = parseXml('<person id="1"><name>Anna</name></person>');

    expect(root.name).toBe("person");
    expect(root.attributes).toEqual([{ name: "id", value: "1" }]);
    expect(root.value).toBeNull();
    expect(root.children).toHaveLength(1);

    const name = root.children[0]!;
    expect(name.name).toBe("name");
    expect(name.value).toBe("Anna");
    expect(name.children).toHaveLength(0);
  });

  it("decodes predefined and numeric entities", () => {
    const { root } = parseXml("<note>Fish &amp; Chips &lt;tag&gt; &#65;&#x42;</note>");
    expect(root.value).toBe("Fish & Chips <tag> AB");
  });

  it("treats CDATA content as raw text, not as nested XML", () => {
    const { root } = parseXml("<data><![CDATA[<not><a><tag>]]></data>");
    expect(root.value).toBe("<not><a><tag>");
    expect(root.children).toHaveLength(0);
  });

  it("keeps namespace prefixes as part of element/attribute names", () => {
    const source = '<ns:root xmlns:ns="http://example.com/ns"><ns:child>x</ns:child></ns:root>';
    const { root } = parseXml(source);

    expect(root.name).toBe("ns:root");
    expect(root.attributes).toEqual([{ name: "xmlns:ns", value: "http://example.com/ns" }]);
    expect(root.children[0]!.name).toBe("ns:child");
  });

  it("throws a descriptive error on malformed XML", () => {
    expect(() => parseXml("<a><b></a>")).toThrow();
    expect(() => parseXml("<a><b>")).toThrow();
  });

  it("computes byteRange in UTF-8 bytes, not UTF-16 code units", () => {
    // "ä" is 1 UTF-16 code unit but 2 UTF-8 bytes, so the byte offset of
    // "<child>" must be one *more* than its character index.
    const source = "<root>ä<child>x</child></root>";
    const { root } = parseXml(source);
    const child = root.children[0]!;

    const charIndex = source.indexOf("<child>");
    const bytes = new TextEncoder().encode(source);
    const decoder = new TextDecoder();
    const [start, end] = child.byteRange!;

    expect(start).toBe(charIndex + 1);
    expect(decoder.decode(bytes.subarray(start, end))).toBe("<child>x</child>");
  });
});

describe("serializeXml", () => {
  it("round-trips an unedited document to a semantically identical tree", () => {
    const source = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<catalog>",
      '  <book id="1"><title>Learning XML</title><price>39.95</price></book>',
      '  <book id="2"><title>Another</title></book>',
      "</catalog>",
    ].join("\n");

    const parsed = parseXml(source);
    const out = serializeXml({ root: parsed.root, xmlDeclaration: parsed.xmlDeclaration, indent: "  " });
    const reparsed = parseXml(out);

    expect(strip(reparsed.root)).toEqual(strip(parsed.root));
  });
});

describe("serializeXmlMinimal", () => {
  it("preserves an unchanged sibling (with a comment nested inside it) byte-for-byte after editing another node", () => {
    const source = "<root><a>1</a><b><!-- keep me -->2</b></root>";
    const { root } = parseXml(source);
    const [a, b] = root.children as [DocNode, DocNode];

    // Simulate an edit: a fresh node for "a" with no byteRange, and a rebuilt
    // root (its own byteRange must be dropped too, since a descendant changed —
    // see the caller-contract note in xml-export.ts).
    const editedA = createNode({ name: a.name, attributes: a.attributes, value: "CHANGED", children: [] });
    const editedRoot = createNode({
      name: root.name,
      attributes: root.attributes,
      value: null,
      children: [editedA, b],
    });

    const result = serializeXmlMinimal(source, { root: editedRoot, indent: "  " });

    // The unchanged sibling's exact original bytes, comment included, survive.
    expect(result).toContain("<b><!-- keep me -->2</b>");
    expect(result).toContain("CHANGED");
    expect(result).not.toMatch(/<a>1<\/a>/);
  });

  it("preserves other unchanged siblings byte-for-byte when only the middle one is edited", () => {
    const source = "<root><x>a</x><y>b</y><z>c</z></root>";
    const { root } = parseXml(source);
    const [x, y, z] = root.children as [DocNode, DocNode, DocNode];

    const editedY = createNode({ name: y.name, attributes: y.attributes, value: "EDITED", children: [] });
    const editedRoot = createNode({
      name: root.name,
      attributes: root.attributes,
      value: null,
      children: [x, editedY, z],
    });

    const result = serializeXmlMinimal(source, { root: editedRoot, indent: "  " });

    expect(result).toContain("<x>a</x>");
    expect(result).toContain("<z>c</z>");
    expect(result).toContain("EDITED");
    expect(result).not.toMatch(/<y>b<\/y>/);
  });

  it("preserves the XML declaration on an edited document (regression: declaration was silently dropped)", () => {
    const source = [
      '<?xml version="1.0" encoding="ISO-8859-1"?>',
      "<root><a>1</a><b>2</b></root>",
    ].join("\n");
    const { root, xmlDeclaration } = parseXml(source);
    const [a, b] = root.children as [DocNode, DocNode];

    const editedA = createNode({ name: a.name, attributes: a.attributes, value: "CHANGED", children: [] });
    const editedRoot = createNode({
      name: root.name,
      attributes: root.attributes,
      value: null,
      children: [editedA, b],
    });

    const result = serializeXmlMinimal(source, { root: editedRoot, xmlDeclaration, indent: "  " });

    expect(result).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
    expect(result).toContain("CHANGED");
  });

  it("preserves the XML declaration even when the document itself is completely unchanged", () => {
    const source = '<?xml version="1.0" encoding="UTF-8"?>\n<root><a>1</a></root>';
    const { root, xmlDeclaration } = parseXml(source);

    const result = serializeXmlMinimal(source, { root, xmlDeclaration, indent: "  " });

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain("<root><a>1</a></root>");
  });
});
