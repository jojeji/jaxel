import { describe, expect, it } from "vitest";
import { createNode } from "@jaxel/core";
import { walkTree } from "./walk.js";

describe("walkTree", () => {
  it("visits every node depth-first, root first, with correct ancestors and depth", () => {
    const grandchild = createNode({ name: "grandchild" });
    const child = createNode({ name: "child", children: [grandchild] });
    const root = createNode({ name: "root", children: [child] });

    const visited: Array<{ name: string; ancestorNames: string[]; depth: number }> = [];
    walkTree(root, (node, ancestors, depth) => {
      visited.push({ name: node.name, ancestorNames: ancestors.map((a) => a.name), depth });
    });

    expect(visited).toEqual([
      { name: "root", ancestorNames: [], depth: 0 },
      { name: "child", ancestorNames: ["root"], depth: 1 },
      { name: "grandchild", ancestorNames: ["root", "child"], depth: 2 },
    ]);
  });

  it("skips a node's children when visit returns false", () => {
    const grandchild = createNode({ name: "grandchild" });
    const child = createNode({ name: "child", children: [grandchild] });
    const sibling = createNode({ name: "sibling" });
    const root = createNode({ name: "root", children: [child, sibling] });

    const visitedNames: string[] = [];
    walkTree(root, (node) => {
      visitedNames.push(node.name);
      return node.name !== "child"; // stop descending into "child"
    });

    expect(visitedNames).toEqual(["root", "child", "sibling"]); // "grandchild" skipped
  });

  it("treats a void return the same as true (descends)", () => {
    const child = createNode({ name: "child" });
    const root = createNode({ name: "root", children: [child] });

    const visitedNames: string[] = [];
    walkTree(root, (node) => {
      visitedNames.push(node.name);
      // no return value
    });

    expect(visitedNames).toEqual(["root", "child"]);
  });
});
