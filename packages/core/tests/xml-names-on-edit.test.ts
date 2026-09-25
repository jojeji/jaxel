import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { parseJson } from "../src/format/json-import.js";
import { planTreeAction, type TreeAction, type TreeActionContext } from "../src/commands/tree-actions.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import type { DocNode } from "../src/model/node.js";

const XML: TreeActionContext = { format: "xml", indent: "  " };
const JSON_CTX: TreeActionContext = { format: "json", indent: "  " };

function planOnChild(root: DocNode, action: TreeAction, context: TreeActionContext = XML) {
  return planTreeAction([{ node: root.children[0]!, ancestors: [root] }], action, context);
}

describe("XML-Namen beim Bearbeiten", () => {
  const { root } = parseXml('<r><b id="1"/></r>');

  it("lehnt ungültige Elementnamen ab und nimmt gültige an", () => {
    expect(planOnChild(root, { kind: "rename", name: "my item" })).toEqual({ ok: false, blocker: "invalid-name" });
    expect(planOnChild(root, { kind: "rename", name: "1st" })).toEqual({ ok: false, blocker: "invalid-name" });
    expect(planOnChild(root, { kind: "rename", name: "ns:größe" }).ok).toBe(true);
  });

  it("lehnt ungültige Attributnamen beim Anlegen und Umbenennen ab", () => {
    expect(planOnChild(root, { kind: "set-attribute", name: "a b", value: "" })).toEqual({
      ok: false,
      blocker: "invalid-name",
    });
    expect(planOnChild(root, { kind: "rename-attribute", index: 0, name: "1x", coalesceKey: "k" })).toEqual({
      ok: false,
      blocker: "invalid-name",
    });
    expect(planOnChild(root, { kind: "set-attribute", name: "id", value: "2" }).ok).toBe(true);
  });

  it("lässt JSON-Schlüssel frei", () => {
    const { root: json } = parseJson('{"a": 1, "b": 2}');
    expect(planOnChild(json, { kind: "rename", name: "my item" }, JSON_CTX).ok).toBe(true);
  });

  it("überspringt bei „Alle ersetzen“ Namen, die ungültig würden, und meldet sie", () => {
    const { root: doc } = parseXml("<r><item/><item2/></r>");
    const result = createReplaceAllCommand(
      doc,
      doc,
      { query: "item", scope: "name", caseSensitive: true, useRegex: false },
      "my item",
      "xml",
    );
    expect(result.command).toBeNull();
    expect(result.skippedInvalidNames).toBe(2);
  });

  it("ersetzt bei JSON auch Schlüssel mit Leerzeichen", () => {
    const { root: json } = parseJson('{"item": 1, "b": 2}');
    const result = createReplaceAllCommand(
      json,
      json,
      { query: "item", scope: "name", caseSensitive: true, useRegex: false },
      "my item",
      "json",
    );
    expect(result.replacementCount).toBe(1);
  });
});
