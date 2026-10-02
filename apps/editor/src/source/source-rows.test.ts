import { describe, expect, it } from "vitest";
import {
  buildRowIndex,
  MAX_SCROLL_HEIGHT,
  pathFrom,
  scrollGeometry,
  tokenizeJson,
  tokenizeXml,
  xmlStateAt,
} from "./source-rows.js";

describe("Zeilenindex der Quelltextansicht", () => {
  it("eine Zeile je Zeilenumbruch, CRLF ohne \\r", () => {
    const text = "a\r\nbb\n\nccc";
    const index = buildRowIndex(text);
    expect(index.lineCount).toBe(4);
    expect(index.rowCount).toBe(4);
    const rows = Array.from({ length: index.rowCount }, (_, r) => text.slice(index.rowStart[r], index.rowEnd[r]));
    expect(rows).toEqual(["a", "bb", "", "ccc"]);
  });

  it("teilt eine überlange Zeile in Anzeigezeilen, nur die erste trägt die Zeilennummer", () => {
    const index = buildRowIndex("x\n" + "y".repeat(25) + "\nz", 10);
    expect(index.rowCount).toBe(5);
    expect(Array.from(index.rowLine)).toEqual([0, 1, 1, 1, 2]);
    expect([0, 1, 2, 3, 4].map((r) => index.isContinuation(r))).toEqual([false, false, true, true, false]);
    expect(index.rowOfLine(2)).toBe(4);
    expect(index.rowOfLine(99)).toBe(4);
  });
});

describe("Scrollgeometrie", () => {
  it("rechnet unterhalb der Höchsthöhe linear", () => {
    const g = scrollGeometry(100, 20);
    expect(g.contentHeight).toBe(2000);
    expect(g.rowAt(400, 300)).toBe(20);
    expect(g.scrollTopFor(20, 300)).toBe(400);
  });

  it("begrenzt die Höhe bei sehr vielen Zeilen und bildet proportional ab", () => {
    const g = scrollGeometry(10_000_000, 20);
    expect(g.contentHeight).toBe(MAX_SCROLL_HEIGHT);
    const top = g.scrollTopFor(5_000_000, 600);
    expect(Math.round(g.rowAt(top, 600))).toBe(5_000_000);
    expect(g.rowAt(MAX_SCROLL_HEIGHT, 600)).toBeCloseTo(10_000_000 - 30);
  });
});

describe("Syntaxfärbung", () => {
  const kinds = (tokens: { text: string; kind: string }[]) => tokens.map((t) => `${t.kind}:${t.text}`);

  it("XML: Tag, Attribut, Wert, Text, Kommentar", () => {
    expect(kinds(tokenizeXml('<a id="1">x</a><!-- c -->', null).tokens)).toEqual([
      "tag:<a", "text: ", "attr:id", "punct:=", 'string:"1"', "tag:>", "text:x", "tag:</a", "tag:>", "comment:<!-- c -->",
    ]);
  });

  it("XML: eine Zeile mitten in einem mehrzeiligen Kommentar", () => {
    const text = "<r>\n<!-- a\n<b/>\n-->\n<c/>";
    const thirdLine = text.indexOf("<b/>");
    expect(xmlStateAt(text, thirdLine)).toBe("comment");
    expect(xmlStateAt(text, text.indexOf("<c/>"))).toBeNull();
    expect(tokenizeXml("<b/>", "comment")).toEqual({ tokens: [{ text: "<b/>", kind: "comment" }], state: "comment" });
    expect(kinds(tokenizeXml("--> <c/>", "comment").tokens)).toEqual(["comment:-->", "text: ", "tag:<c", "tag:/>"]);
    expect(tokenizeXml("<x/><!-- beginnt hier", null).state).toBe("comment");
    expect(tokenizeXml("<x/><!-- endet -->", null).state).toBeNull();
  });

  it("JSON: Schlüssel, Zeichenkette, Zahl, Literal", () => {
    expect(kinds(tokenizeJson('  "a": "x", "n": -1.5e3, "b": true'))).toEqual([
      "text:  ", 'key:"a"', "punct::", "text: ", 'string:"x"', "punct:,", "text: ",
      'key:"n"', "punct::", "text: ", "number:-1.5e3", "punct:,", "text: ", 'key:"b"', "punct::", "text: ", "literal:true",
    ]);
  });
});

describe("Pfad vom sichtbaren Wurzelknoten", () => {
  it("liefert Kindindizes ab der sichtbaren Wurzel", () => {
    const c = { children: [] as never[] };
    const b = { children: [{ children: [] }, c] as typeof c[] };
    const a = { children: [b] as typeof c[] };
    expect(pathFrom(a, [a, b, c])).toEqual([0, 1]);
    expect(pathFrom(b, [a, b, c])).toEqual([1]);
    expect(pathFrom(c, [a, b])).toBeNull();
  });
});
