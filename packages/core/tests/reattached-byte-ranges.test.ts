import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXmlMinimal } from "../src/format/xml-export.js";
import { syncByteRangesAfterSave } from "../src/commands/byte-range.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { createRemoveNodeCommand } from "../src/commands/remove-node.js";
import { createUncommentCommand } from "../src/commands/comment.js";
import { createBulkDuplicateCommand } from "../src/commands/bulk.js";
import type { DocNode } from "../src/model/node.js";

/** The app's save sequence (workspace.ts `commitSaved`): write, re-sync, move the baseline. */
function editor(source: string) {
  let text = source;
  const { root } = parseXml(source);
  const bus = new CommandBus(createDocument({ format: "xml", root }));
  return {
    root,
    bus,
    save(): string {
      text = serializeXmlMinimal(text, { root, indent: "  " });
      syncByteRangesAfterSave(root, parseXml(text).root);
      bus.markSaved();
      return text;
    },
  };
}

// A node that was off the tree during a save (held only by the undo/redo history) still
// carried byteRanges into the PREVIOUS file text; putting it back and saving copied the wrong
// bytes — non-wellformed XML.
describe("Wieder eingehängte Knoten nach einem Speichern", () => {
  it("Löschen, Speichern, Rückgängig, Speichern bringt den Knoten unverändert zurück", () => {
    const e = editor("<root><aaaaaaaaaa>1</aaaaaaaaaa><b>2</b><c>3</c></root>");
    e.bus.execute(createRemoveNodeCommand(e.root, 1, []));
    e.save();
    e.bus.undo();
    const out = e.save();
    expect(parseXml(out).root.children.map((c) => c.name)).toEqual(["aaaaaaaaaa", "b", "c"]);
    expect(out).toContain("<b>2</b>");
  });

  it("Einkommentieren rückgängig machen nach einem Speichern schreibt den Kommentar korrekt", () => {
    const e = editor("<root><x>some padding text</x><!-- <old>1</old> --><b>BBB</b></root>");
    e.bus.execute(createUncommentCommand(e.root, 1, [])!);
    e.save();
    e.bus.undo();
    const out = e.save();
    expect(out).toContain("<!-- <old>1</old> -->");
    expect(parseXml(out).root.children.map((c) => c.name)).toEqual(["x", "#comment", "b"]);
  });

  it("Duplizieren, Speichern, Rückgängig, Speichern, Wiederholen, Speichern bleibt wohlgeformt", () => {
    const e = editor("<root><a>1</a><b>BBB</b></root>");
    const b = e.root.children[1]!;
    e.bus.execute(createBulkDuplicateCommand([{ node: b, ancestors: [e.root] }])!.command);
    e.save();
    e.bus.undo();
    e.save();
    e.bus.redo();
    const out = e.save();
    expect(parseXml(out).root.children.map((c) => c.value)).toEqual(["1", "BBB", "BBB"]);
  });

  it("der Abgleich nach dem Speichern wirft nicht, wenn Modell und geschriebener Text abweichen", () => {
    const { root } = parseXml("<root><a>1</a><b>2</b></root>");
    const fresh = parseXml("<root><a>1</a></root>").root;
    expect(() => syncByteRangesAfterSave(root, fresh)).not.toThrow();
    // Nothing left that could be copied from the wrong place.
    const ranges: unknown[] = [];
    const walk = (n: DocNode): void => {
      ranges.push(n.byteRange);
      n.children.forEach(walk);
    };
    walk(root);
    expect(ranges.every((r) => r === undefined)).toBe(true);
  });
});
