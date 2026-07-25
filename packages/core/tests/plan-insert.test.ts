import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { planInsertRelativeToRow } from "../src/commands/sibling-slot.js";

describe("planInsertRelativeToRow", () => {
  it("at the root: inserts as the root's own last child", () => {
    const a = createNode({ name: "a" });
    const root = createNode({ name: "root", children: [a] });

    const plan = planInsertRelativeToRow({ node: root, ancestors: [] });

    expect(plan).toEqual({ parent: root, parentAncestors: [], index: 1, insertedAsChild: true });
  });

  it("on an empty root: inserts as the root's first child", () => {
    const root = createNode({ name: "root", children: [] });

    const plan = planInsertRelativeToRow({ node: root, ancestors: [] });

    expect(plan).toEqual({ parent: root, parentAncestors: [], index: 0, insertedAsChild: true });
  });

  it("on a nested node: inserts as its next sibling", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const parent = createNode({ name: "parent", children: [a, b] });
    const root = createNode({ name: "root", children: [parent] });

    const plan = planInsertRelativeToRow({ node: a, ancestors: [root, parent] });

    expect(plan).toEqual({ parent, parentAncestors: [root], index: 1, insertedAsChild: false });
  });

  it("stale row (not found among its claimed parent's children): returns null, not a child-insert fallback", () => {
    const parent = createNode({ name: "parent", children: [] });
    const orphan = createNode({ name: "orphan" });

    expect(planInsertRelativeToRow({ node: orphan, ancestors: [parent] })).toBeNull();
  });
});
