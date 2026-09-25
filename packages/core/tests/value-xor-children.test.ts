import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { parseJson } from "../src/format/json-import.js";
import { serializeJson } from "../src/format/json-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { moveTargetBlocker, planTreeAction, treeActionBlocker } from "../src/commands/tree-actions.js";

const XML = { format: "xml" as const, indent: "  " };
const JSON_CTX = { format: "json" as const, indent: "  " };

// A node holds a value OR children. Adding a child to a node with text lost the text on XML
// save and the child on JSON save (each exporter keeps a different half).
describe("Kein Kind in einen Knoten mit Wert", () => {
  it("sperrt Kind hinzufügen und Kommentar als Kind bei XML-Text", () => {
    const { root } = parseXml("<r><a>keep me</a><z/></r>");
    const row = { node: root.children[0]!, ancestors: [root] };
    expect(treeActionBlocker([row], "add-child", XML)).toBe("has-value");
    expect(treeActionBlocker([row], "add-comment-child", XML)).toBe("has-value");
  });

  it("sperrt Kind hinzufügen bei einem JSON-Wert", () => {
    const { root } = parseJson('{"a": 1, "b": "x"}');
    expect(treeActionBlocker([{ node: root.children[0]!, ancestors: [root] }], "add-child", JSON_CTX)).toBe("has-value");
  });

  it("sperrt das Hineinziehen in einen Knoten mit Wert", () => {
    const { root } = parseXml("<r><a>keep me</a><b/></r>");
    expect(moveTargetBlocker({ node: root.children[0]!, ancestors: [root] }, "into")).toBe("has-value");
    expect(moveTargetBlocker({ node: root.children[0]!, ancestors: [root] }, "after")).toBeNull();
  });

  it("erlaubt ein Kind unter einem leeren Element und macht es zum Container (ein Undo-Schritt)", () => {
    const { root } = parseXml("<r><a/><z/></r>");
    const bus = new CommandBus(createDocument({ format: "xml", root }));
    const a = root.children[0]!;
    const result = planTreeAction([{ node: a, ancestors: [root] }], { kind: "add-child" }, XML);
    if (!result.ok) throw new Error(result.blocker);
    bus.execute(result.plan.command);
    expect(a.value).toBeNull();
    expect(serializeXml({ root, indent: "" })).toContain("<node/>");
    bus.undo();
    expect(a.value).toBe("");
    expect(a.children).toEqual([]);
  });

  it("ein Kind unter einem leeren JSON-String geht beim Speichern nicht verloren", () => {
    const { root } = parseJson('{"a": "", "b": 1}');
    const bus = new CommandBus(createDocument({ format: "json", root }));
    const result = planTreeAction([{ node: root.children[0]!, ancestors: [root] }], { kind: "add-child" }, JSON_CTX);
    if (!result.ok) throw new Error(result.blocker);
    bus.execute(result.plan.command);
    expect(JSON.parse(serializeJson({ root, indent: "  " }))).toEqual({ a: { node: {} }, b: 1 });
  });

  it("Hineinziehen in ein leeres Element leert dessen Wert im selben Schritt", () => {
    const { root } = parseXml("<r><a/><b>1</b></r>");
    const bus = new CommandBus(createDocument({ format: "xml", root }));
    const [a, b] = root.children;
    const result = planTreeAction([{ node: b!, ancestors: [root] }], { kind: "move", target: { node: a!, ancestors: [root] }, position: "into" }, XML);
    if (!result.ok) throw new Error(result.blocker);
    bus.execute(result.plan.command);
    expect(a!.value).toBeNull();
    expect(serializeXml({ root, indent: "" })).toContain("<a>\n<b>1</b>\n</a>");
  });
});
