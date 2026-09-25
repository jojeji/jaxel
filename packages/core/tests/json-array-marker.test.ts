import { describe, expect, it } from "vitest";
import { parseJson } from "../src/format/json-import.js";
import { serializeJson } from "../src/format/json-export.js";
import { parseXml } from "../src/format/xml-import.js";
import { convertDocument } from "../src/format/convert.js";

function roundTrip(source: string): unknown {
  return JSON.parse(serializeJson({ root: parseJson(source).root, indent: "  " }));
}

// The export guessed "array inside an array" (mapping rule 4) from names alone: every child
// named like its parent. An ordinary object nested under a key of the same name matched too.
describe("JSON: Arrays im Array werden am Knoten markiert, nicht aus Namen erraten", () => {
  it.each([
    ['{"a":{"a":1}}'],
    ['{"data":{"data":[1,2]}}'],
    ['{"x":1,"list":{"list":{"k":1}}}'],
    ['{"list":[{"list":1},{"x":2}]}'],
  ])("verschachtelte gleichnamige Objekte bleiben Objekte: %s", (source) => {
    expect(roundTrip(source)).toEqual(JSON.parse(source));
  });

  it.each([
    ['{"m":[[1,2],[3]],"z":0}'],
    ['[[1,2],[3,4]]'],
    ['{"list":[1,2]}'],
    ['[]'],
    ['{"a":[[],[1]],"z":0}'],
  ])("echte Arrays bleiben Arrays: %s", (source) => {
    expect(roundTrip(source)).toEqual(JSON.parse(source));
  });

  it("XML nach JSON: gleichnamige verschachtelte Elemente werden kein Array", () => {
    const parsed = parseXml("<r><div><div>x</div></div><p/></r>");
    const json = convertDocument({ to: "json", root: parsed.root, indent: "  " });
    expect(JSON.parse(json)).toEqual({ r: { div: { div: "x" }, p: "" } });
  });
});
