import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { COMMENT_NAME, isComment, isCommentedOutSubtree, elementChildren } from "../src/model/node.js";

describe("Kommentare als Knoten", () => {
  it("nimmt einen Kommentar als Kind an seiner Position auf", () => {
    const { root } = parseXml("<catalog><!-- die erste Person --><person>Anna</person></catalog>");
    expect(root.children).toHaveLength(2);
    expect(isComment(root.children[0]!)).toBe(true);
    expect(root.children[0]!.name).toBe(COMMENT_NAME);
    expect(root.children[0]!.value).toBe(" die erste Person ");
    expect(root.children[1]!.name).toBe("person");
  });

  it("behält die Reihenfolge zwischen Elementen", () => {
    const { root } = parseXml("<r><a/><!-- dazwischen --><b/></r>");
    expect(root.children.map((c) => c.name)).toEqual(["a", COMMENT_NAME, "b"]);
  });

  it("blendet Kommentare über elementChildren aus", () => {
    const { root } = parseXml("<r><!-- x --><a/><!-- y --><b/></r>");
    expect(elementChildren(root).map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("macht aus einem Element mit Text und Kommentar keinen Container", () => {
    // Mixed Content bleibt die dokumentierte Grenze: der Text gewinnt.
    const { root } = parseXml("<a>Anna<!-- Notiz --></a>");
    expect(root.value).toBe("Anna");
    expect(root.children).toHaveLength(0);
  });

  it("behält einen Kommentar als einzigen Inhalt", () => {
    const { root } = parseXml("<a><!-- nur ein Hinweis --></a>");
    expect(root.value).toBeNull();
    expect(root.children).toHaveLength(1);
    expect(isComment(root.children[0]!)).toBe(true);
  });

  it("behält einen Kommentar auch neben reinem Whitespace", () => {
    const { root } = parseXml("<a>\n  <!-- Hinweis -->\n</a>");
    expect(root.children).toHaveLength(1);
    expect(isComment(root.children[0]!)).toBe(true);
  });

  it("schreibt Kommentare beim vollständigen Serialisieren zurück", () => {
    const source = "<catalog><!-- die erste Person --><person>Anna</person></catalog>";
    const { root } = parseXml(source);
    expect(serializeXml({ root, indent: "  " })).toBe(
      ["<catalog>", "  <!-- die erste Person -->", "  <person>Anna</person>", "</catalog>", ""].join("\n"),
    );
  });
});

describe("Auskommentierte Teilbäume", () => {
  it("erkennt wohlgeformtes XML im Kommentar und zeigt es als Struktur", () => {
    const { root } = parseXml("<catalog><!-- <person id=\"P-9\"><name>Zoe</name></person> --></catalog>");
    const comment = root.children[0]!;
    expect(isCommentedOutSubtree(comment)).toBe(true);
    expect(comment.children).toHaveLength(1);
    expect(comment.children[0]!.name).toBe("person");
    expect(comment.children[0]!.children[0]!.name).toBe("name");
    expect(comment.children[0]!.children[0]!.value).toBe("Zoe");
  });

  it("erkennt mehrere Geschwister im selben Kommentar", () => {
    const { root } = parseXml("<r><!-- <a/><b/> --></r>");
    expect(root.children[0]!.children.map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("behandelt Prosa weiterhin als Textkommentar", () => {
    const { root } = parseXml("<r><!-- TODO: Preise prüfen --></r>");
    const comment = root.children[0]!;
    expect(isComment(comment)).toBe(true);
    expect(isCommentedOutSubtree(comment)).toBe(false);
  });

  it("fällt bei unvollständigem Markup auf Prosa zurück", () => {
    const { root } = parseXml("<r><!-- <person> ergänzen --></r>");
    expect(isCommentedOutSubtree(root.children[0]!)).toBe(false);
  });

  it("gibt den Originaltext zurück, nicht die geparste Struktur", () => {
    // Der Rohtext ist maßgeblich — die Kinder sind nur Ansicht.
    const source = '<r><!--   <a   x="1"/>   --></r>';
    const { root } = parseXml(source);
    expect(serializeXml({ root, indent: "" })).toBe('<r>\n<!--   <a   x="1"/>   -->\n</r>\n');
  });

  it("trägt keine Byte-Bereiche in den Kommentar-Kindern", () => {
    // Sie wären Offsets in den Kommentartext, nicht in die Datei — der minimal-invasive
    // Speicherpfad würde daraus von völlig falschen Stellen kopieren.
    const { root } = parseXml('<r><!-- <a><b>x</b></a> --></r>');
    const inner = root.children[0]!.children[0]!;
    expect(inner.byteRange).toBeUndefined();
    expect(inner.children[0]!.byteRange).toBeUndefined();
  });
});
