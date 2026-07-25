import { describe, expect, it } from "vitest";
import { convertDocument, InvalidXmlNameError, isValidXmlName } from "./convert.js";
import { parseXml } from "./xml-import.js";
import { parseJson } from "./json-import.js";
import { serializeXml } from "./xml-export.js";

function xmlToJson(xml: string): string {
  return convertDocument({ to: "json", root: parseXml(xml).root, indent: "  " });
}

function jsonToXml(json: string, encoding = "UTF-8"): string {
  return convertDocument({ to: "xml", root: parseJson(json).root, indent: "  ", encoding });
}

describe("isValidXmlName", () => {
  it.each(["a", "person", "_x", "ram:Name", "a-b.c1", "Größe"])("accepts %j", (name) => {
    expect(isValidXmlName(name)).toBe(true);
  });

  it.each(["1. Quartal", "foo bar", "", "@x", "#text", "a/b", "$root"])("rejects %j", (name) => {
    expect(isValidXmlName(name)).toBe(false);
  });
});

describe("XML -> JSON", () => {
  it("maps a plain element tree to nested objects", () => {
    expect(xmlToJson("<catalog><person><name>Ada</name></person></catalog>")).toBe(
      ['{', '  "catalog": {', '    "person": {', '      "name": "Ada"', "    }", "  }", "}"].join("\n"),
    );
  });

  it("writes attributes as @-properties", () => {
    expect(xmlToJson('<person id="7"><name>Ada</name></person>')).toBe(
      ["{", '  "person": {', '    "@id": "7",', '    "name": "Ada"', "  }", "}"].join("\n"),
    );
  });

  it("moves text into #text when the element also has attributes", () => {
    expect(xmlToJson('<preis waehrung="EUR">19.99</preis>')).toBe(
      ["{", '  "preis": {', '    "@waehrung": "EUR",', '    "#text": "19.99"', "  }", "}"].join("\n"),
    );
  });

  it("keeps an attribute-less element with text as a bare string", () => {
    expect(xmlToJson("<preis>19.99</preis>")).toBe(['{', '  "preis": "19.99"', "}"].join("\n"));
  });

  it("types every value as a string — XML carries no type information", () => {
    // "42" must not silently become the JSON number 42.
    expect(xmlToJson("<n>42</n>")).toContain('"n": "42"');
    expect(xmlToJson("<flag>true</flag>")).toContain('"flag": "true"');
  });

  it("folds same-named siblings into an array", () => {
    expect(xmlToJson("<liste><item>a</item><item>b</item></liste>")).toBe(
      ["{", '  "liste": {', '    "item": [', '      "a",', '      "b"', "    ]", "  }", "}"].join("\n"),
    );
  });

  it("writes an empty element as an empty string", () => {
    expect(xmlToJson("<a/>")).toBe(["{", '  "a": ""', "}"].join("\n"));
  });

  it("keeps an empty element's attributes, without an empty #text", () => {
    expect(xmlToJson('<a x="1"/>')).toBe(["{", '  "a": {', '    "@x": "1"', "  }", "}"].join("\n"));
  });

  it("escapes values that are not JSON-safe", () => {
    expect(xmlToJson('<a>er sagte "hallo"</a>')).toContain('"a": "er sagte \\"hallo\\""');
  });
});

describe("JSON -> XML", () => {
  it("maps nested objects to nested elements", () => {
    expect(jsonToXml('{"catalog": {"person": {"name": "Ada"}}}')).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<catalog>",
        "  <person>",
        "    <name>Ada</name>",
        "  </person>",
        "</catalog>",
        "",
      ].join("\n"),
    );
  });

  it("turns @-properties back into attributes", () => {
    expect(jsonToXml('{"person": {"@id": "7", "name": "Ada"}}')).toContain(
      '<person id="7">',
    );
  });

  it("turns #text back into element text", () => {
    expect(jsonToXml('{"preis": {"@waehrung": "EUR", "#text": "19.99"}}')).toContain(
      '<preis waehrung="EUR">19.99</preis>',
    );
  });

  it("drops number and boolean types — XML cannot carry them", () => {
    expect(jsonToXml('{"a": {"n": 42, "flag": true, "nix": null}}')).toContain(
      ["  <n>42</n>", "  <flag>true</flag>", "  <nix>null</nix>"].join("\n"),
    );
  });

  it("uses the document's encoding in the generated declaration", () => {
    expect(jsonToXml('{"a": "b"}', "ISO-8859-1")).toContain('encoding="ISO-8859-1"');
  });

  it("invents a <root> element for a bare array", () => {
    expect(jsonToXml('[1, 2]')).toBe(
      ['<?xml version="1.0" encoding="UTF-8"?>', "<root>", "  <root>1</root>", "  <root>2</root>", "</root>", ""].join(
        "\n",
      ),
    );
  });

  it("invents a <root> element for a multi-key root object", () => {
    expect(jsonToXml('{"a": "1", "b": "2"}')).toBe(
      ['<?xml version="1.0" encoding="UTF-8"?>', "<root>", "  <a>1</a>", "  <b>2</b>", "</root>", ""].join("\n"),
    );
  });

  it("keeps a real single root key even when it had to be marked synthetic", () => {
    // json-import flags this root synthetic (its value expands to two nodes) but the name is
    // the user's own — it must not be replaced by the invented <root>.
    expect(jsonToXml('{"person": [{"n": "1"}, {"n": "2"}]}')).toContain("<person>");
  });

  it("escapes XML-unsafe characters in values", () => {
    expect(jsonToXml('{"a": "x < y & z"}')).toContain("<a>x &lt; y &amp; z</a>");
  });

  describe("keys that cannot be XML names", () => {
    it("rejects a key starting with a digit", () => {
      expect(() => jsonToXml('{"berichte": {"jahr": {"1. Quartal": "x"}}}')).toThrow(InvalidXmlNameError);
    });

    it("names the offending key and its parent path", () => {
      try {
        jsonToXml('{"berichte": {"jahr": {"1. Quartal": "x"}}}');
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidXmlNameError);
        expect((err as InvalidXmlNameError).key).toBe("1. Quartal");
        expect((err as InvalidXmlNameError).path).toBe("berichte.jahr");
      }
    });

    it("rejects an @-property whose value is an object — it cannot become an attribute", () => {
      // Falls back to being an ordinary child, and "@x" is not a valid element name.
      try {
        jsonToXml('{"a": {"@x": {"deep": "1"}}}');
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as InvalidXmlNameError).key).toBe("@x");
      }
    });

    it("rejects #text alongside real children — XML would need mixed content", () => {
      try {
        jsonToXml('{"a": {"#text": "hallo", "b": "1"}}');
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as InvalidXmlNameError).key).toBe("#text");
      }
    });

    it("rejects an attribute name that is not a valid XML name", () => {
      try {
        jsonToXml('{"a": {"@foo bar": "1"}}');
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as InvalidXmlNameError).key).toBe("@foo bar");
        expect((err as InvalidXmlNameError).path).toBe("a");
      }
    });
  });
});

describe("Round-trip XML -> JSON -> XML", () => {
  it.each([
    "<catalog><person><name>Ada</name></person></catalog>",
    '<person id="7" rolle="admin"><name>Ada</name></person>',
    '<preis waehrung="EUR">19.99</preis>',
    "<liste><item>a</item><item>b</item></liste>",
    '<a x="1"/>',
  ])("survives %s", (xml) => {
    const json = convertDocument({ to: "json", root: parseXml(xml).root, indent: "  " });
    const back = convertDocument({ to: "xml", root: parseJson(json).root, indent: "  " });
    // The declaration is generated rather than round-tripped, so compare bodies only. The
    // reference is the original tree serialized straight back out — the conversion must not
    // reshape anything on the way through JSON.
    const bodyOf = (text: string): string => text.split("\n").slice(1).join("\n").trim();
    expect(bodyOf(back)).toBe(serializeXml({ root: parseXml(xml).root, indent: "  " }).trim());
  });
});
