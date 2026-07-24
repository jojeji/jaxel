import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { planMove } from "../src/commands/move-node.js";
import type { DocNode } from "../src/model/node.js";

describe("planMove", () => {
  it("returns null when the source is the root (nothing to remove it from)", () => {
    const root = createNode({ name: "root" });
    const other = createNode({ name: "other" });

    expect(planMove({ node: root, ancestors: [] }, { node: other, ancestors: [root] }, "into")).toBeNull();
  });

  it("returns null when dropping before/after the root (no siblings)", () => {
    const root = createNode({ name: "root" });
    const child = createNode({ name: "child" });

    expect(planMove({ node: child, ancestors: [root] }, { node: root, ancestors: [] }, "before")).toBeNull();
    expect(planMove({ node: child, ancestors: [root] }, { node: root, ancestors: [] }, "after")).toBeNull();
  });

  it("'into' targets the end of the target's children", () => {
    const a = createNode({ name: "a" });
    const container = createNode({ name: "container", children: [] });
    const root = createNode({ name: "root", children: [a, container] });

    const plan = planMove({ node: a, ancestors: [root] }, { node: container, ancestors: [root] }, "into");

    expect(plan).toEqual({
      sourceParent: root,
      sourceIndex: 0,
      sourceAncestors: [],
      targetParent: container,
      targetIndex: 0,
      targetAncestors: [root],
    });
  });

  it("reordering forward within the same parent applies the -1 index correction", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const c = createNode({ name: "c" });
    const root = createNode({ name: "root", children: [a, b, c] });

    // Drop "a" (index 0) AFTER "b" (index 1): the raw anchor+1 would be 2, but since "a" gets
    // removed first, the correct post-removal index is 1.
    const plan = planMove({ node: a, ancestors: [root] }, { node: b, ancestors: [root] }, "after");

    expect(plan).toMatchObject({ sourceParent: root, sourceIndex: 0, targetParent: root, targetIndex: 1 });
  });

  it("returns null for a no-op move (dropping a node back where it already is)", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const root = createNode({ name: "root", children: [a, b] });

    // "before" b == a's current position.
    expect(planMove({ node: a, ancestors: [root] }, { node: b, ancestors: [root] }, "before")).toBeNull();
  });

  it("moves across two different parents without any index correction", () => {
    const child = createNode({ name: "child" });
    const sourceParent = createNode({ name: "source", children: [child] });
    const targetParent = createNode({ name: "target", children: [] });
    const root = createNode({ name: "root", children: [sourceParent, targetParent] });

    const plan = planMove(
      { node: child, ancestors: [root, sourceParent] },
      { node: targetParent, ancestors: [root] },
      "into",
    );

    expect(plan).toEqual({
      sourceParent,
      sourceIndex: 0,
      sourceAncestors: [root],
      targetParent,
      targetIndex: 0,
      targetAncestors: [root],
    });
  });

  it("returns null when the source node isn't actually found among its claimed parent's children", () => {
    const root = createNode({ name: "root", children: [] });
    const orphan = createNode({ name: "orphan" }); // not actually in root.children
    const other = createNode({ name: "other" });
    const withOther = createNode({ name: "with-other", children: [other] });

    expect(planMove({ node: orphan, ancestors: [root] }, { node: other, ancestors: [withOther] }, "before")).toBeNull();
  });

  it("plan feeds directly into createMoveNodeCommand's expected argument shape", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const root = createNode({ name: "root", children: [a, b] });

    const plan = planMove({ node: a, ancestors: [root] }, { node: b, ancestors: [root] }, "after");
    expect(plan).not.toBeNull();
    const { sourceParent, sourceIndex, sourceAncestors, targetParent, targetIndex, targetAncestors } = plan as NonNullable<
      typeof plan
    >;
    void ([sourceAncestors, targetAncestors] as DocNode[][]); // shape check only
    expect(sourceParent).toBe(root);
    expect(sourceIndex).toBe(0);
    expect(targetParent).toBe(root);
    expect(targetIndex).toBe(1);
  });
});
