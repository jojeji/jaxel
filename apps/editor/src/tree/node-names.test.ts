import { describe, expect, it } from "vitest";
import { createCommentNode, createNode, parseJson, parseXml } from "@jaxel/core";
import { copyableName, namesToCopy } from "./node-names.js";

describe("Bezeichner kopieren", () => {
  it("liefert den XML-Elementnamen inklusive Namespace-Präfix", () => {
    const doc = parseXml('<ns:Kunde xmlns:ns="urn:x"><ns:Name>A</ns:Name></ns:Kunde>');
    expect(copyableName(doc.root)).toBe("ns:Kunde");
    expect(namesToCopy([doc.root, doc.root.children[0]!])).toBe("ns:Kunde\nns:Name");
  });

  it("liefert den JSON-Schlüssel, auch für Array-Einträge (gleichnamige Geschwister)", () => {
    const doc = parseJson('{"tags": ["a", "b"]}');
    const names = doc.root.children.length > 0 ? doc.root.children : [doc.root];
    expect(namesToCopy(names)).toBe(names.map(() => "tags").join("\n"));
  });

  it("überspringt Kommentare; nur Kommentare ergeben null", () => {
    const comment = createCommentNode({ text: "hallo" });
    const element = createNode({ name: "a" });
    expect(copyableName(comment)).toBeNull();
    expect(namesToCopy([comment])).toBeNull();
    expect(namesToCopy([element, comment, createNode({ name: "b" })])).toBe("a\nb");
  });
});
