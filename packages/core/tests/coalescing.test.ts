import { describe, expect, it } from "vitest";
import {
  CommandBus,
  createDocument,
  createRenameAttributeCommand,
  createSetAttributeCommand,
  parseXml,
} from "../src/index.js";

function setup(xml: string) {
  const { root } = parseXml(xml);
  const doc = createDocument({ format: "xml", root, encoding: "UTF-8" });
  return { root, bus: new CommandBus(doc) };
}

describe("CommandBus-Coalescing (per-Tastendruck-Ketten = EIN Undo-Schritt)", () => {
  it("verschmilzt aufeinanderfolgende Commands mit gleichem coalesceKey", () => {
    const { root, bus } = setup("<a/>");
    const key = `attr-new:${root.id}:0`;
    bus.execute(createSetAttributeCommand(root, "r", "", [], key));
    bus.execute(createRenameAttributeCommand(root, 0, "ro", [], key));
    bus.execute(createRenameAttributeCommand(root, 0, "role", [], key));
    expect(root.attributes).toEqual([{ name: "role", value: "" }]);

    bus.undo(); // EIN Schritt entfernt die gesamte Tipp-Kette
    expect(root.attributes).toEqual([]);
    expect(bus.canUndo()).toBe(false);

    bus.redo();
    expect(root.attributes).toEqual([{ name: "role", value: "" }]);
  });

  it("unterschiedliche oder fehlende Keys brechen die Kette", () => {
    const { root, bus } = setup("<a/>");
    bus.execute(createSetAttributeCommand(root, "x", "1", [], "k1"));
    bus.execute(createSetAttributeCommand(root, "y", "2", [], "k2"));
    bus.execute(createSetAttributeCommand(root, "z", "3", []));
    expect(root.attributes).toHaveLength(3);

    bus.undo();
    expect(root.attributes.map((a) => a.name)).toEqual(["x", "y"]);
    bus.undo();
    expect(root.attributes.map((a) => a.name)).toEqual(["x"]);
    bus.undo();
    expect(root.attributes).toEqual([]);
  });
});

describe("createRenameAttributeCommand", () => {
  it("benennt per Index um und erhaelt Position + Wert", () => {
    const { root, bus } = setup('<a x="1" y="2"/>');
    bus.execute(createRenameAttributeCommand(root, 0, "renamed", []));
    expect(root.attributes).toEqual([
      { name: "renamed", value: "1" },
      { name: "y", value: "2" },
    ]);
    expect(root.byteRange).toBeUndefined(); // minimal-invasives Speichern muss neu serialisieren

    bus.undo();
    expect(root.attributes.map((a) => a.name)).toEqual(["x", "y"]);
  });
});
