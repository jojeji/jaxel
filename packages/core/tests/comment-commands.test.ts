import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import {
  commentOutBlocker,
  createCommentOutCommand,
  createUncommentCommand,
} from "../src/commands/comment.js";
import { isComment, isCommentedOutSubtree } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";

function busFor(source: string): { bus: CommandBus; root: DocNode } {
  const { root } = parseXml(source);
  return { bus: new CommandBus(createDocument({ format: "xml", root })), root };
}

describe("Auskommentieren", () => {
  it("ersetzt den Knoten an seiner Stelle durch einen Kommentar", () => {
    const { bus, root } = busFor("<catalog><a>1</a><b>2</b></catalog>");
    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);

    expect(root.children).toHaveLength(2);
    expect(isComment(root.children[0]!)).toBe(true);
    expect(root.children[0]!.value).toBe(" <a>1</a> ");
    expect(root.children[1]!.name).toBe("b");
  });

  it("schreibt den Kommentar korrekt in die Datei", () => {
    const { bus, root } = busFor("<catalog><a>1</a></catalog>");
    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);
    expect(serializeXml({ root, indent: "  " })).toBe("<catalog>\n  <!-- <a>1</a> -->\n</catalog>\n");
  });

  it("zeigt den auskommentierten Knoten weiterhin als Struktur", () => {
    const { bus, root } = busFor("<catalog><person><name>Anna</name></person></catalog>");
    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);

    const comment = root.children[0]!;
    expect(isCommentedOutSubtree(comment)).toBe(true);
    expect(comment.children[0]!.name).toBe("person");
  });

  it("nimmt den Modellstand, nicht die Originalbytes", () => {
    // Ein vor dem Auskommentieren geänderter Wert muss im Kommentar landen.
    const { bus, root } = busFor("<catalog><a>1</a></catalog>");
    root.children[0]!.value = "geaendert";
    root.children[0]!.byteRange = undefined;
    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);
    expect(root.children[0]!.value).toBe(" <a>geaendert</a> ");
  });

  it("macht Rückgängig den Knoten wieder lebendig", () => {
    const { bus, root } = busFor("<catalog><a>1</a></catalog>");
    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);
    bus.undo();
    expect(isComment(root.children[0]!)).toBe(false);
    expect(root.children[0]!.name).toBe("a");
    expect(serializeXml({ root, indent: "  " })).toBe("<catalog>\n  <a>1</a>\n</catalog>\n");
  });

  it("lehnt einen Knoten ab, der bereits einen Kommentar enthält", () => {
    const { root } = busFor("<catalog><person><!-- Stammkunde --><name>Anna</name></person></catalog>");
    expect(commentOutBlocker(root.children[0]!)).toBe("contains-comment");
    expect(createCommentOutCommand(root, 0, [], "  ")).toBeNull();
  });

  it("lehnt einen Knoten mit -- im Text ab", () => {
    const { root } = busFor("<catalog><notiz>Vertrag A--B</notiz></catalog>");
    expect(commentOutBlocker(root.children[0]!)).toBe("contains-double-hyphen");
    expect(createCommentOutCommand(root, 0, [], "  ")).toBeNull();
  });

  it("lehnt einen Knoten mit -- im Attributwert ab", () => {
    const { root } = busFor('<catalog><a ref="x--y"/></catalog>');
    expect(commentOutBlocker(root.children[0]!)).toBe("contains-double-hyphen");
  });

  it("lehnt -- in einem tief verschachtelten Nachfahren ab", () => {
    const { root } = busFor("<catalog><a><b><c>x--y</c></b></a></catalog>");
    expect(commentOutBlocker(root.children[0]!)).toBe("contains-double-hyphen");
  });

  it("erlaubt einen unauffälligen Knoten", () => {
    const { root } = busFor("<catalog><a x='1'>Text ohne Auffälligkeit</a></catalog>");
    expect(commentOutBlocker(root.children[0]!)).toBeNull();
  });

  it("kommentiert einen bereits auskommentierten Knoten nicht erneut aus", () => {
    const { root } = busFor("<catalog><!-- <a/> --></catalog>");
    expect(createCommentOutCommand(root, 0, [], "  ")).toBeNull();
  });
});

describe("Einkommentieren", () => {
  it("macht aus dem Kommentar wieder lebendige Knoten", () => {
    const { bus, root } = busFor("<catalog><!-- <a>1</a> --><b>2</b></catalog>");
    bus.execute(createUncommentCommand(root, 0, [])!);

    expect(root.children.map((c) => c.name)).toEqual(["a", "b"]);
    expect(serializeXml({ root, indent: "  " })).toBe("<catalog>\n  <a>1</a>\n  <b>2</b>\n</catalog>\n");
  });

  it("stellt mehrere Geschwister aus einem Kommentar her", () => {
    const { bus, root } = busFor("<catalog><!-- <a/><b/> --><c/></catalog>");
    bus.execute(createUncommentCommand(root, 0, [])!);
    expect(root.children.map((c) => c.name)).toEqual(["a", "b", "c"]);
  });

  it("macht Rückgängig den Kommentar wieder daraus — auch bei mehreren Geschwistern", () => {
    const source = "<catalog><!-- <a/><b/> --><c/></catalog>";
    const { bus, root } = busFor(source);
    bus.execute(createUncommentCommand(root, 0, [])!);
    bus.undo();
    expect(root.children).toHaveLength(2);
    expect(isComment(root.children[0]!)).toBe(true);
    expect(serializeXml({ root, indent: "  " })).toBe("<catalog>\n  <!-- <a/><b/> -->\n  <c/>\n</catalog>\n");
  });

  it("lehnt einen Prosa-Kommentar ab", () => {
    const { root } = busFor("<catalog><!-- TODO: Preise prüfen --></catalog>");
    expect(createUncommentCommand(root, 0, [])).toBeNull();
  });

  it("lehnt ein gewöhnliches Element ab", () => {
    const { root } = busFor("<catalog><a/></catalog>");
    expect(createUncommentCommand(root, 0, [])).toBeNull();
  });
});

describe("Hin und zurück", () => {
  it("stellt nach Auskommentieren und Einkommentieren den Ursprung wieder her", () => {
    const source = '<catalog><person id="P-1"><name>Anna</name></person><b/></catalog>';
    const { bus, root } = busFor(source);

    bus.execute(createCommentOutCommand(root, 0, [], "  ")!);
    expect(isComment(root.children[0]!)).toBe(true);

    bus.execute(createUncommentCommand(root, 0, [])!);
    expect(serializeXml({ root, indent: "  " })).toBe(
      [
        "<catalog>",
        '  <person id="P-1">',
        "    <name>Anna</name>",
        "  </person>",
        "  <b/>",
        "</catalog>",
        "",
      ].join("\n"),
    );
  });
});
