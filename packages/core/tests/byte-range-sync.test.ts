import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXmlMinimal } from "../src/format/xml-export.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { syncByteRangesAfterSave } from "../src/commands/byte-range.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import type { DocNode } from "../src/model/node.js";

// Regression for: editing field A, saving, then editing a DIFFERENT field B and saving
// again corrupted the file. Root cause: after the first save the app kept using the
// FRESH file text as the byte source for minimal-invasive save, but left every untouched
// node's `byteRange` pointing at offsets from the ORIGINAL source — stale the moment an
// earlier edit shifted anything before it.
describe("syncByteRangesAfterSave", () => {
  it("keeps a second minimal-invasive save correct after an earlier edit shifted byte offsets", () => {
    const source = "<root><a>1</a><b>2</b><c>3</c></root>";
    const { root } = parseXml(source);
    const [a, b, c] = root.children as [DocNode, DocNode, DocNode];
    void c;
    const bus = new CommandBus(createDocument({ format: "xml", root }));

    // First edit: "a" gets a much longer value, shifting every byte offset after it.
    bus.execute(createSetValueCommand(a, "MUCH LONGER THAN BEFORE", undefined, [root]));
    const textAfterFirstSave = serializeXmlMinimal(source, { root, indent: "" });
    expect(textAfterFirstSave).toContain("<a>MUCH LONGER THAN BEFORE</a>");
    expect(textAfterFirstSave).toContain("<b>2</b>");
    expect(textAfterFirstSave).toContain("<c>3</c>");

    // The fix: refresh byteRanges against the file that was just written, in place.
    syncByteRangesAfterSave(root, parseXml(textAfterFirstSave).root);
    bus.markSaved();

    // Second edit: touch "b", leave "c" untouched.
    bus.execute(createSetValueCommand(b, "EDITED", undefined, [root]));
    const textAfterSecondSave = serializeXmlMinimal(textAfterFirstSave, { root, indent: "" });

    expect(textAfterSecondSave).toContain("<a>MUCH LONGER THAN BEFORE</a>");
    expect(textAfterSecondSave).toContain("<b>EDITED</b>");
    expect(textAfterSecondSave).toContain("<c>3</c>");
  });

  it("without the refresh, the second save reads the untouched sibling from the wrong offset (bug reproduction)", () => {
    const source = "<root><a>1</a><b>2</b><c>3</c></root>";
    const { root } = parseXml(source);
    const [a, b] = root.children as [DocNode, DocNode];
    const bus = new CommandBus(createDocument({ format: "xml", root }));

    bus.execute(createSetValueCommand(a, "MUCH LONGER THAN BEFORE", undefined, [root]));
    const textAfterFirstSave = serializeXmlMinimal(source, { root, indent: "" });

    // BUG: no syncByteRangesAfterSave call — "c" still carries its byteRange from the
    // ORIGINAL `source`, but the next save's reference text is `textAfterFirstSave`.
    bus.markSaved();
    bus.execute(createSetValueCommand(b, "EDITED", undefined, [root]));
    const textAfterSecondSave = serializeXmlMinimal(textAfterFirstSave, { root, indent: "" });

    expect(textAfterSecondSave).not.toContain("<c>3</c>");
  });
});

// Regression for: edit a field, save, Strg+Z (undo), save again — expected the ORIGINAL
// value back, got the changed value (or outright invalid XML) instead. Root cause: undo
// restored a byteRange captured BEFORE the first save, which is stale the moment the
// reference text changes on save — fixed by CommandBus's save-epoch check (see
// command-bus.ts, "byteRange-Lebenszyklus" in command-bus.test.ts for the unit-level test).
describe("edit -> save -> undo -> save", () => {
  it("the second save reproduces the ORIGINAL value, not the undone-past edit", () => {
    const source = "<root><a>ORIGINAL</a><b>2</b></root>";
    const { root } = parseXml(source);
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);
    const a = root.children[0]! as DocNode;

    function fakeSave(sourceText: string): string {
      const text = serializeXmlMinimal(sourceText, { root: doc.root, indent: "" });
      bus.markSaved();
      syncByteRangesAfterSave(doc.root, parseXml(text).root);
      return text;
    }

    let sourceText = source;

    bus.execute(createSetValueCommand(a, "CHANGED", undefined, [root]));
    sourceText = fakeSave(sourceText);
    expect(sourceText).toContain("<a>CHANGED</a>");

    bus.undo();
    expect(a.value).toBe("ORIGINAL");

    sourceText = fakeSave(sourceText);
    expect(sourceText).toContain("<a>ORIGINAL</a>");
    expect(sourceText).not.toContain("CHANGED");
  });
});
