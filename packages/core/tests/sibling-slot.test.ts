import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { findSiblingSlot } from "../src/commands/sibling-slot.js";

describe("findSiblingSlot", () => {
  it("returns null for the root (no siblings)", () => {
    const root = createNode({ name: "root" });
    expect(findSiblingSlot({ node: root, ancestors: [] })).toBeNull();
  });

  it("returns parent, parentAncestors and index for a nested node", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const parent = createNode({ name: "parent", children: [a, b] });
    const root = createNode({ name: "root", children: [parent] });

    const slot = findSiblingSlot({ node: b, ancestors: [root, parent] });

    expect(slot).toEqual({ parent, parentAncestors: [root], index: 1 });
  });

  it("returns null when the node isn't actually among its claimed parent's children", () => {
    const parent = createNode({ name: "parent", children: [] });
    const orphan = createNode({ name: "orphan" });
    expect(findSiblingSlot({ node: orphan, ancestors: [parent] })).toBeNull();
  });
});
