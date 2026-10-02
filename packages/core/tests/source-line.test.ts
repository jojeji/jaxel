import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { sourceLineOf } from "../src/format/source-line.js";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<katalog>
  <!-- Größe: ä -->
  <person id="1">
    <name>Ännchen</name>
  </person>
  <person id="2"><name>Ben</name></person>
</katalog>
`;

const JSON_TEXT = `{
  "kunde": "Anna",
  "posten": [
    {"nr": 1},
    {"nr": 2}
  ],
  "summe": 3
}`;

// Line numbers are 0-based; `path` holds child indices from the visible root.
describe("Zeile eines Knotens im Quelltext", () => {
  it("XML: findet Elemente und Kommentare, auch hinter Mehrbyte-Zeichen", () => {
    expect(sourceLineOf({ format: "xml", text: XML, path: [] })).toBe(1);
    expect(sourceLineOf({ format: "xml", text: XML, path: [0] })).toBe(2);
    expect(sourceLineOf({ format: "xml", text: XML, path: [1, 0] })).toBe(4);
    expect(sourceLineOf({ format: "xml", text: XML, path: [2, 0] })).toBe(6);
  });

  it("XML: nutzt die Byte-Bereiche eines Baums, der zu genau diesem Text gehört, ohne neu zu parsen", () => {
    const { root } = parseXml(XML);
    expect(sourceLineOf({ format: "xml", text: XML, path: [1, 0], rangesFrom: root })).toBe(4);
  });

  it("JSON: Eigenschaften an ihrem Schlüssel, Array-Elemente an ihrem Wert", () => {
    expect(sourceLineOf({ format: "json", text: JSON_TEXT, path: [0] })).toBe(1);
    expect(sourceLineOf({ format: "json", text: JSON_TEXT, path: [2] })).toBe(4);
    expect(sourceLineOf({ format: "json", text: JSON_TEXT, path: [2, 0] })).toBe(4);
    expect(sourceLineOf({ format: "json", text: JSON_TEXT, path: [3] })).toBe(6);
  });

  it("fällt auf den nächsten auffindbaren Vorfahren zurück", () => {
    expect(sourceLineOf({ format: "xml", text: XML, path: [1, 7] })).toBe(3);
    expect(sourceLineOf({ format: "xml", text: "kein xml", path: [0] })).toBe(0);
  });
});
