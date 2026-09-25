import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { createSetAttributeCommand } from "../src/commands/set-attribute.js";

describe("Attribut entfernen rückgängig machen", () => {
  it("setzt das Attribut an seine alte Stelle zurück, nicht ans Ende", () => {
    const { root } = parseXml('<a x="1" y="2" z="3"/>');
    const bus = new CommandBus(createDocument({ format: "xml", root }));
    bus.execute(createSetAttributeCommand(root, "x", null, []));
    bus.undo();
    expect(root.attributes.map((a) => a.name)).toEqual(["x", "y", "z"]);
    bus.redo();
    expect(root.attributes.map((a) => a.name)).toEqual(["y", "z"]);
  });
});
