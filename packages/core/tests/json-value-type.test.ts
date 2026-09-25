import { describe, expect, it } from "vitest";
import { parseJson } from "../src/format/json-import.js";
import { serializeJson } from "../src/format/json-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { planTreeAction } from "../src/commands/tree-actions.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import { jsonTypeAfterEdit } from "../src/commands/set-value.js";
import type { DocNode } from "../src/model/node.js";

function load(source: string): { bus: CommandBus; root: DocNode } {
  const { root } = parseJson(source);
  return { bus: new CommandBus(createDocument({ format: "json", root })), root };
}

function setValue(bus: CommandBus, root: DocNode, key: string, value: string): void {
  const node = root.children.find((child) => child.name === key)!;
  const result = planTreeAction([{ node, ancestors: [root] }], { kind: "set-value", value }, { format: "json", indent: "  " });
  if (result.ok) bus.execute(result.plan.command);
}

function saved(root: DocNode): unknown {
  return JSON.parse(serializeJson({ root, indent: "  " }));
}

describe("JSON-Werttyp beim Bearbeiten", () => {
  it("macht aus Text in einem Zahl-Feld einen String statt ungültigem JSON", () => {
    const { bus, root } = load('{"n": 42, "z": 0}');
    setValue(bus, root, "n", "42 items");
    expect(saved(root)).toEqual({ n: "42 items", z: 0 });
  });

  it("behält eine gültige Zahl als Zahl", () => {
    const { bus, root } = load('{"n": 42, "z": 0}');
    setValue(bus, root, "n", "-4.5e3");
    expect(saved(root)).toEqual({ n: -4500, z: 0 });
  });

  it("behält true/false/null nur als gültige Literale, sonst String", () => {
    const { bus, root } = load('{"ok": true, "x": null}');
    setValue(bus, root, "ok", "false");
    setValue(bus, root, "x", "leer");
    expect(saved(root)).toEqual({ ok: false, x: "leer" });
  });

  it("macht einen geleerten Zahlenwert zum leeren String", () => {
    const { bus, root } = load('{"n": 42, "z": 0}');
    setValue(bus, root, "n", "");
    expect(saved(root)).toEqual({ n: "", z: 0 });
  });

  it("lässt einen String ein String, auch wenn Ziffern hineingetippt werden", () => {
    const { bus, root } = load('{"s": "a", "z": 0}');
    setValue(bus, root, "s", "42");
    expect(saved(root)).toEqual({ s: "42", z: 0 });
  });

  it("folgt beim Alle-ersetzen derselben Regel", () => {
    const { bus, root } = load('{"ok": true, "n": 1}');
    const { command } = createReplaceAllCommand(root, root, { query: "true", scope: "value", caseSensitive: true, useRegex: false }, "yes");
    bus.execute(command!);
    expect(saved(root)).toEqual({ ok: "yes", n: 1 });
  });

  it("gilt nur für JSON-Werte (XML hat keinen Typ)", () => {
    expect(jsonTypeAfterEdit(undefined, "42")).toBeUndefined();
    expect(jsonTypeAfterEdit("number", "01")).toBe("string"); // führende Null ist kein JSON-Zahlliteral
  });
});
