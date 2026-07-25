import { describe, expect, it } from "vitest";
import { parseFragments, serializeFragments } from "../src/format/fragments.js";
import { parseDocument } from "../src/format/document.js";
import { createNode } from "../src/model/node.js";

describe("parseFragments (XML)", () => {
  it("parses a single fragment as a one-element list", () => {
    const result = parseFragments("xml", "<person id=\"P-1\"><name>Anna</name></person>");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("person");
    expect(result[0]!.attributes).toEqual([{ name: "id", value: "P-1" }]);
  });

  it("parses several sibling fragments", () => {
    const result = parseFragments("xml", "<a>1</a>\n<b>2</b>\n<c>3</c>");
    expect(result.map((node) => node.name)).toEqual(["a", "b", "c"]);
    expect(result.map((node) => node.value)).toEqual(["1", "2", "3"]);
  });

  it("ignores whitespace between fragments", () => {
    expect(parseFragments("xml", "  <a/>   \n\n  <b/>  ")).toHaveLength(2);
  });

  it("strips a leading XML declaration (it belongs to a document, not a fragment)", () => {
    const result = parseFragments("xml", '<?xml version="1.0" encoding="UTF-8"?><root><x/></root>');
    expect(result.map((node) => node.name)).toEqual(["root"]);
  });

  it("throws on malformed XML", () => {
    expect(() => parseFragments("xml", "<a></b>")).toThrow();
  });
});

describe("parseFragments (JSON)", () => {
  it("parses a single-key object as one fragment", () => {
    const result = parseFragments("json", '{"person": {"name": "Anna"}}');
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("person");
  });

  it("unwraps a multi-key object into several fragments", () => {
    const result = parseFragments("json", '{"a": 1, "b": 2}');
    expect(result.map((node) => node.name)).toEqual(["a", "b"]);
  });

  it("unwraps same-named siblings written as an array", () => {
    const result = parseFragments("json", '{"person": [{"id": "P-1"}, {"id": "P-2"}]}');
    expect(result.map((node) => node.name)).toEqual(["person", "person"]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseFragments("json", "{oops")).toThrow();
  });
});

describe("parseFragments — fresh ids and no byteRanges", () => {
  it("regenerates ids so pasted nodes never collide with the target document", () => {
    const source = "<a><b/></a>";
    const first = parseFragments("xml", source);
    const second = parseFragments("xml", source);
    expect(first[0]!.id).not.toBe(second[0]!.id);
  });

  it("drops byteRanges (they would point into the payload, not the target document)", () => {
    const [node] = parseFragments("xml", "<a><b>x</b></a>");
    expect(node!.byteRange).toBeUndefined();
    expect(node!.children[0]!.byteRange).toBeUndefined();
  });
});

describe("serializeFragments", () => {
  it("XML: writes fragments one after another", () => {
    const nodes = [createNode({ name: "a", value: "1" }), createNode({ name: "b", value: "2" })];
    expect(serializeFragments("xml", nodes, "  ")).toBe("<a>1</a>\n<b>2</b>");
  });

  it("JSON: writes differently-named nodes as one object's properties", () => {
    const nodes = [
      createNode({ name: "a", value: "1", jsonType: "number" }),
      createNode({ name: "b", value: "2", jsonType: "number" }),
    ];
    expect(JSON.parse(serializeFragments("json", nodes, "  "))).toEqual({ a: 1, b: 2 });
  });

  it("JSON: folds same-named nodes back into an array", () => {
    const nodes = [
      createNode({ name: "p", value: "1", jsonType: "number" }),
      createNode({ name: "p", value: "2", jsonType: "number" }),
    ];
    expect(JSON.parse(serializeFragments("json", nodes, "  "))).toEqual({ p: [1, 2] });
  });
});

describe("serializeFragments -> parseFragments round-trip", () => {
  it("XML: several nodes survive the round-trip by name and value", () => {
    const original = parseFragments("xml", "<a>1</a><b>2</b><c><d>3</d></c>");
    const back = parseFragments("xml", serializeFragments("xml", original, "  "));
    expect(back.map((node) => node.name)).toEqual(["a", "b", "c"]);
    expect(back[2]!.children[0]!.name).toBe("d");
  });

  it("JSON: several nodes survive the round-trip, same-named ones included", () => {
    const original = parseFragments("json", '{"p": [1, 2], "q": "x"}');
    const back = parseFragments("json", serializeFragments("json", original, "  "));
    expect(back.map((node) => node.name)).toEqual(["p", "p", "q"]);
  });

  it("a single node round-trips to exactly one fragment in both formats", () => {
    const xmlNode = parseDocument("xml", "<person><name>Anna</name></person>").root;
    expect(parseFragments("xml", serializeFragments("xml", [xmlNode], "  "))).toHaveLength(1);

    const jsonNode = parseDocument("json", '{"person": {"name": "Anna"}}').root;
    expect(parseFragments("json", serializeFragments("json", [jsonNode], "  "))).toHaveLength(1);
  });
});
