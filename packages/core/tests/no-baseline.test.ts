import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { createSetValueCommand } from "../src/commands/set-value.js";

// CONTEXT.md "Baseline": content that is stored nowhere (clipboard, Base64 preview) has no
// baseline until it is saved — it is dirty from the start, and undo cannot make it clean.
describe("Dokument ohne Baseline", () => {
  it("ist von Anfang an dirty und bleibt es auch nach Rückgängig", () => {
    const { root } = parseXml("<r>1</r>");
    const bus = new CommandBus(createDocument({ format: "xml", root }), { hasBaseline: false });
    expect(bus.isDirty()).toBe(true);
    bus.execute(createSetValueCommand(root, "2", undefined, []));
    bus.undo();
    expect(bus.isDirty()).toBe(true);
  });

  it("bekommt mit dem ersten Speichern eine Baseline", () => {
    const { root } = parseXml("<r>1</r>");
    const bus = new CommandBus(createDocument({ format: "xml", root }), { hasBaseline: false });
    bus.markSaved();
    expect(bus.isDirty()).toBe(false);
    bus.execute(createSetValueCommand(root, "2", undefined, []));
    bus.undo();
    expect(bus.isDirty()).toBe(false);
  });

  it("ein gewöhnliches Dokument startet sauber", () => {
    const { root } = parseXml("<r>1</r>");
    expect(new CommandBus(createDocument({ format: "xml", root })).isDirty()).toBe(false);
  });
});
