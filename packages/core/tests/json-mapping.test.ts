import { describe, expect, it } from "vitest";
import { parseJson } from "../src/format/json-import.js";
import { serializeJson } from "../src/format/json-export.js";

describe("parseJson", () => {
  it("reference example: single-key root with a one-element array-of-object collapses to direct children", () => {
    const { root } = parseJson('{ "person": [ { "id": 1, "name": "Anna" } ] }');

    expect(root.name).toBe("person");
    expect(root.synthetic).toBeFalsy();
    expect(root.attributes).toEqual([]);
    expect(root.children.map((c) => c.name)).toEqual(["id", "name"]);

    const id = root.children.find((c) => c.name === "id")!;
    expect(id.value).toBe("1");
    expect(id.jsonType).toBe("number");
    expect(id.attributes).toEqual([]);

    const name = root.children.find((c) => c.name === "name")!;
    expect(name.value).toBe("Anna");
    expect(name.jsonType).toBe("string");
  });

  it("an array of primitives as a property produces same-named sibling nodes (rule 2)", () => {
    const { root } = parseJson('{"container": {"tags": ["x", "y"]}}');

    expect(root.name).toBe("container");
    expect(root.children.map((c) => c.name)).toEqual(["tags", "tags"]);
    expect(root.children.map((c) => c.value)).toEqual(["x", "y"]);
    expect(root.children.every((c) => c.jsonType === "string")).toBe(true);
  });

  it("nested arrays propagate the property name down the tree (rule 4)", () => {
    const { root } = parseJson('{"container": {"matrix": [[1, 2], [3, 4]]}}');

    expect(root.children).toHaveLength(2);
    for (const outer of root.children) {
      expect(outer.name).toBe("matrix");
      expect(outer.children).toHaveLength(2);
      for (const inner of outer.children) {
        expect(inner.name).toBe("matrix");
        expect(inner.jsonType).toBe("number");
      }
    }
    expect(root.children[0]!.children.map((c) => c.value)).toEqual(["1", "2"]);
    expect(root.children[1]!.children.map((c) => c.value)).toEqual(["3", "4"]);
  });

  it("design decision: a single root key whose value is a multi-element array still needs a wrapper, flagged synthetic", () => {
    // Unlike the reference example (array length 1, which collapses), an array with more than one
    // element cannot be represented by a single root node without an extra tree level. The key
    // itself is real (not invented), but the wrapper level is, hence `synthetic: true`.
    const { root } = parseJson('{"matrix": [[1, 2], [3, 4]]}');

    expect(root.name).toBe("matrix");
    expect(root.synthetic).toBe(true);
    expect(root.children).toHaveLength(2);
    expect(root.children.every((c) => c.name === "matrix")).toBe(true);

    // And it still round-trips exactly, because the fallback preserves the array shape.
    expect(JSON.parse(serializeJson({ root, indent: "  " }))).toEqual(JSON.parse('{"matrix": [[1, 2], [3, 4]]}'));
  });

  it("a root object with several top-level keys gets a synthetic $root wrapper", () => {
    const { root } = parseJson('{"a": 1, "b": 2}');

    expect(root.name).toBe("$root");
    expect(root.synthetic).toBe(true);
    expect(root.value).toBeNull();
    expect(root.children.map((c) => c.name)).toEqual(["a", "b"]);
    expect(root.children.map((c) => c.value)).toEqual(["1", "2"]);
  });

  it("an empty root object ({}) also gets a synthetic $root wrapper with no children", () => {
    const { root } = parseJson("{}");

    expect(root.name).toBe("$root");
    expect(root.synthetic).toBe(true);
    expect(root.children).toEqual([]);
  });

  it("a bare top-level array becomes a synthetic $root with repeated $root children (design decision)", () => {
    const { root } = parseJson("[1, 2, 3]");

    expect(root.name).toBe("$root");
    expect(root.synthetic).toBe(true);
    expect(root.value).toBeNull();
    expect(root.children.map((c) => c.name)).toEqual(["$root", "$root", "$root"]);
    expect(root.children.map((c) => c.value)).toEqual(["1", "2", "3"]);
  });

  it("a bare top-level primitive is stored directly on the synthetic $root node, not a further child (design decision)", () => {
    const str = parseJson('"hallo"').root;
    expect(str.name).toBe("$root");
    expect(str.synthetic).toBe(true);
    expect(str.value).toBe("hallo");
    expect(str.jsonType).toBe("string");
    expect(str.children).toEqual([]);

    const num = parseJson("42").root;
    expect(num.name).toBe("$root");
    expect(num.synthetic).toBe(true);
    expect(num.value).toBe("42");
    expect(num.jsonType).toBe("number");
    expect(num.children).toEqual([]);
  });

  it("preserves the original number text verbatim, including trailing zeros", () => {
    const { root } = parseJson('{"price": 1.50}');

    expect(root.name).toBe("price");
    expect(root.value).toBe("1.50");
    expect(root.jsonType).toBe("number");

    const out = serializeJson({ root, indent: "  " });
    expect(out).toBe('{\n  "price": 1.50\n}');
  });

  it("decodes JSON string escapes on import and re-escapes them on export", () => {
    // Runtime JSON source text (after TS string-literal unescaping) is:
    //   {"text": "a\nb\"c\\däe"}
    // i.e. a literal newline-escape, quote-escape, backslash-escape and \u unicode escape for a
    // German umlaut, exactly as they'd appear in a JSON file on disk.
    const source = '{"text": "a\\nb\\"c\\\\d\\u00e4e"}';
    const { root } = parseJson(source);

    expect(root.name).toBe("text");
    expect(root.jsonType).toBe("string");
    expect(root.value).toBe('a\nb"c\\däe');

    const out = serializeJson({ root, indent: "  " });
    expect(JSON.parse(out)).toEqual(JSON.parse(source));
    expect(parseJson(out).root.value).toBe(root.value);
  });

  it("round-trips several full documents through parseJson -> serializeJson -> JSON.parse", () => {
    const documents = [
      // Nested object with every primitive type.
      '{"user": {"name": "Bob", "age": 30, "active": true, "score": 12.5, "note": null}}',
      // Multi-element array of objects under a single root key.
      '{"items": [{"id": 1, "label": "a"}, {"id": 2, "label": "b"}, {"id": 3, "label": "c"}]}',
      // Bare top-level array mixing primitives of every type plus a nested object.
      '[1, "two", true, null, {"x": 1}]',
    ];

    for (const source of documents) {
      const { root } = parseJson(source);
      const out = serializeJson({ root, indent: "  " });
      expect(JSON.parse(out)).toEqual(JSON.parse(source));
    }
  });
});
