import { describe, expect, it } from "vitest";
import { createNode } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";
import { nextSelectedRow, planArrowLeft, planArrowRight } from "./keyboard-nav.js";

function row(node: ReturnType<typeof createNode>, ancestors: ReturnType<typeof createNode>[] = []): TreeRow {
  return { node, ancestors, depth: ancestors.length, hasChildren: node.children.length > 0 };
}

describe("nextSelectedRow", () => {
  it("returns null when there are no rows", () => {
    expect(nextSelectedRow([], null, 1)).toBeNull();
  });

  it("no selection yet: ArrowDown lands on the first row, ArrowUp on the last", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const rows = [row(a), row(b)];

    expect(nextSelectedRow(rows, null, 1)).toBe(rows[0]);
    expect(nextSelectedRow(rows, null, -1)).toBe(rows[1]);
  });

  it("moves by delta and clamps at both ends", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const c = createNode({ name: "c" });
    const rows = [row(a), row(b), row(c)];

    expect(nextSelectedRow(rows, a.id, 1)).toBe(rows[1]);
    expect(nextSelectedRow(rows, c.id, 1)).toBe(rows[2]); // clamped, stays on last
    expect(nextSelectedRow(rows, a.id, -1)).toBe(rows[0]); // clamped, stays on first
  });
});

describe("planArrowRight", () => {
  it("expands a collapsed node with children", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });

    expect(planArrowRight(row(parent), new Set())).toEqual({ type: "expand", nodeId: parent.id });
  });

  it("selects the first child of an already-expanded node", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });

    expect(planArrowRight(row(parent), new Set([parent.id]))).toEqual({ type: "select", nodeId: child.id });
  });

  it("is a no-op on a childless row", () => {
    const leaf = createNode({ name: "leaf" });

    expect(planArrowRight(row(leaf), new Set())).toEqual({ type: "none" });
  });
});

describe("planArrowLeft", () => {
  it("collapses an expanded node with children", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });

    expect(planArrowLeft(row(parent), new Set([parent.id]))).toEqual({ type: "collapse", nodeId: parent.id });
  });

  it("selects the parent of a collapsed/childless row", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });

    expect(planArrowLeft(row(child, [parent]), new Set())).toEqual({ type: "select", nodeId: parent.id });
  });

  it("is a no-op at the visible root", () => {
    const root = createNode({ name: "root" });

    expect(planArrowLeft(row(root), new Set())).toEqual({ type: "none" });
  });
});
