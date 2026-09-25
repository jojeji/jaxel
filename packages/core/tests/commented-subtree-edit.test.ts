import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml, serializeXmlMinimal } from "../src/format/xml-export.js";
import { syncByteRangesAfterSave } from "../src/commands/byte-range.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { planTreeAction } from "../src/commands/tree-actions.js";
import { createUncommentCommand } from "../src/commands/comment.js";
import { findAll } from "../src/search/search.js";

const XML = { format: "xml" as const, indent: "  " };

function load(source: string) {
  const { root } = parseXml(source);
  const bus = new CommandBus(createDocument({ format: "xml", root }));
  const comment = root.children.find((c) => c.kind === "comment")!;
  const edit = (value: string): void => {
    const result = planTreeAction([{ node: comment, ancestors: [root] }], { kind: "set-value", value }, XML);
    if (!result.ok) throw new Error(result.blocker);
    bus.execute(result.plan.command);
  };
  return { root, bus, comment, edit };
}

// The parsed children of a commented-out subtree are derived from its text; editing the text
// left them stale, so "Einkommentieren" restored the old content and saving lost the edit.
describe("Text eines auskommentierten Teilbaums bearbeiten", () => {
  it("Einkommentieren nach dem Bearbeiten bringt den neuen Inhalt zurück", () => {
    const { root, bus, edit } = load("<root><!-- <b>2</b> --><c/></root>");
    edit(" <b>3</b> ");
    bus.execute(createUncommentCommand(root, 0, [])!);
    expect(serializeXml({ root, indent: "" })).toContain("<b>3</b>");
  });

  it("Rückgängig stellt auch den alten Teilbaum wieder her", () => {
    const { bus, comment, edit } = load("<root><!-- <b>2</b> --><c/></root>");
    edit(" <b>3</b> ");
    bus.undo();
    expect(comment.children.map((c) => c.value)).toEqual(["2"]);
  });

  it("aus Markup wird Prosa: keine Kinder mehr, und Speichern + erneutes Speichern behält den Text", () => {
    const source = "<r>\n  <!-- <old/> -->\n  <b>1</b>\n</r>";
    const { root, bus, comment, edit } = load(source);
    edit(" just prose ");
    expect(comment.children).toEqual([]);
    const first = serializeXmlMinimal(source, { root, indent: "  " });
    syncByteRangesAfterSave(root, parseXml(first).root);
    bus.markSaved();
    const second = serializeXmlMinimal(first, { root, indent: "  " });
    expect(second).toContain("<!-- just prose -->");
  });

  it("die Suche findet den neuen Text im Teilbaum", () => {
    const { root, edit } = load("<root><!-- <b>2</b> --><c/></root>");
    edit(" <b>3</b> ");
    const hits = findAll(root, { query: "3", scope: "value", caseSensitive: true, useRegex: false });
    expect(hits.length).toBeGreaterThan(0);
  });
});
