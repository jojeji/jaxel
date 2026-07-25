import { describe, expect, it } from "vitest";
import { createNode } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";
import { computeDropAllowed, positionFromRatio } from "./dnd.js";

function row(node: ReturnType<typeof createNode>, ancestors: ReturnType<typeof createNode>[] = []): TreeRow {
  return { node, ancestors, depth: ancestors.length, hasChildren: node.children.length > 0 };
}

describe("positionFromRatio", () => {
  it("the outer quarters mean before/after, the middle half means into", () => {
    expect(positionFromRatio(0)).toBe("before");
    expect(positionFromRatio(0.24)).toBe("before");
    expect(positionFromRatio(0.25)).toBe("into");
    expect(positionFromRatio(0.5)).toBe("into");
    expect(positionFromRatio(0.75)).toBe("into");
    expect(positionFromRatio(0.76)).toBe("after");
    expect(positionFromRatio(1)).toBe("after");
  });
});

describe("computeDropAllowed", () => {
  it("rejects dropping a node onto itself", () => {
    const a = createNode({ name: "a" });
    const root = createNode({ name: "root", children: [a] });

    expect(computeDropAllowed(a, row(a, [root]), "into")).toBe(false);
  });

  it("rejects dropping a node into its own subtree", () => {
    const grandchild = createNode({ name: "grandchild" });
    const child = createNode({ name: "child", children: [grandchild] });
    const root = createNode({ name: "root", children: [child] });

    expect(computeDropAllowed(child, row(grandchild, [root, child]), "into")).toBe(false);
  });

  it("allows dropping into an unrelated node", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const root = createNode({ name: "root", children: [a, b] });

    expect(computeDropAllowed(a, row(b, [root]), "into")).toBe(true);
  });

  it("rejects before/after the visible root (no sibling level)", () => {
    const a = createNode({ name: "a" });
    const root = createNode({ name: "root", children: [a] });

    expect(computeDropAllowed(a, row(root, []), "before")).toBe(false);
    expect(computeDropAllowed(a, row(root, []), "after")).toBe(false);
  });

  it("allows dropping into the visible root even though it has no sibling level", () => {
    const a = createNode({ name: "a" });
    const root = createNode({ name: "root", children: [a] });

    expect(computeDropAllowed(a, row(root, []), "into")).toBe(true);
  });

  it("allows dropping before/after an unrelated non-root node", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const root = createNode({ name: "root", children: [a, b] });

    expect(computeDropAllowed(a, row(b, [root]), "before")).toBe(true);
    expect(computeDropAllowed(a, row(b, [root]), "after")).toBe(true);
  });
});
