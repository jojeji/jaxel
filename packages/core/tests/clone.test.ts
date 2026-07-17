import { describe, expect, it } from "vitest";
import { cloneSubtree, parseXml } from "../src/index.js";

describe("cloneSubtree", () => {
  it("klont tief mit frischen Ids und ohne byteRange", () => {
    const { root } = parseXml('<a x="1"><b>text</b><b>zwei</b></a>');
    const clone = cloneSubtree(root);

    expect(clone.name).toBe("a");
    expect(clone.attributes).toEqual([{ name: "x", value: "1" }]);
    expect(clone.children.map((c) => c.value)).toEqual(["text", "zwei"]);

    const collectIds = (n: typeof root): string[] => [n.id, ...n.children.flatMap(collectIds)];
    const originalIds = new Set(collectIds(root));
    for (const id of collectIds(clone)) {
      expect(originalIds.has(id)).toBe(false);
    }

    const assertNoByteRange = (n: typeof root): void => {
      expect(n.byteRange).toBeUndefined();
      n.children.forEach(assertNoByteRange);
    };
    assertNoByteRange(clone);
  });

  it("entkoppelt den Klon vom Original (Mutation schlaegt nicht durch)", () => {
    const { root } = parseXml("<a><b>text</b></a>");
    const clone = cloneSubtree(root);
    clone.children[0]!.value = "geaendert";
    clone.attributes.push({ name: "neu", value: "x" });
    expect(root.children[0]!.value).toBe("text");
    expect(root.attributes).toHaveLength(0);
  });
});
