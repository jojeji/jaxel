import { describe, expect, it } from "vitest";
import { captureChangeBaseline, computeChanges, createNode } from "@jaxel/core";
import type { DocNode } from "@jaxel/core";
import { flattenTree, withTombstones, type DisplayRow } from "./flatten.js";

function names(displayRows: DisplayRow[]): string[] {
  return displayRows.map((row) => (row.kind === "node" ? row.row.node.name : `~${row.tombstone.name}~`));
}

function sampleTree(): DocNode {
  return createNode({
    name: "root",
    children: [
      createNode({ name: "a", value: "1" }),
      createNode({ name: "b", value: "2" }),
      createNode({ name: "c", value: "3" }),
    ],
  });
}

describe("withTombstones", () => {
  it("passes rows through unchanged when there is nothing to mark", () => {
    const root = sampleTree();
    const rows = flattenTree(root, new Set([root.id]));

    const result = withTombstones(rows, null);

    expect(names(result)).toEqual(["root", "a", "b", "c"]);
    expect(result.every((r) => r.kind === "node")).toBe(true);
  });

  it("inserts a tombstone right after its anchor sibling", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const b = root.children[1]!;
    root.children = root.children.filter((c) => c !== b);
    const changes = computeChanges(root, baseline);

    const rows = flattenTree(root, new Set([root.id]));
    const result = withTombstones(rows, changes);

    expect(names(result)).toEqual(["root", "a", "~b~", "c"]);
  });

  it("inserts a tombstone as the first child when the anchor is null", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const a = root.children[0]!;
    root.children = root.children.filter((c) => c !== a);
    const changes = computeChanges(root, baseline);

    const rows = flattenTree(root, new Set([root.id]));
    const result = withTombstones(rows, changes);

    expect(names(result)).toEqual(["root", "~a~", "b", "c"]);
  });

  it("orders consecutive deletions anchored to the same sibling by their original position", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const [a, b, c] = root.children;
    root.children = root.children.filter((n) => n === a);
    void b;
    void c;
    const changes = computeChanges(root, baseline);

    const rows = flattenTree(root, new Set([root.id]));
    const result = withTombstones(rows, changes);

    expect(names(result)).toEqual(["root", "a", "~b~", "~c~"]);
  });

  it("places a tombstone after its anchor's FULL expanded subtree, not immediately after its row", () => {
    const root = createNode({
      name: "root",
      children: [
        createNode({
          name: "container",
          children: [createNode({ name: "inner", value: "x" })],
        }),
        createNode({ name: "after", value: "y" }),
      ],
    });
    const baseline = captureChangeBaseline(root);
    const container = root.children[0]!;
    const after = root.children[1]!;
    root.children = root.children.filter((c) => c !== after); // delete "after", anchored to "container"
    const changes = computeChanges(root, baseline);

    const rows = flattenTree(root, new Set([root.id, container.id])); // container expanded
    const result = withTombstones(rows, changes);

    expect(names(result)).toEqual(["root", "container", "inner", "~after~"]);
  });

  it("does not surface tombstones of a collapsed parent", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const b = root.children[1]!;
    root.children = root.children.filter((c) => c !== b);
    const changes = computeChanges(root, baseline);

    const rows = flattenTree(root, new Set()); // root itself collapsed
    const result = withTombstones(rows, changes);

    expect(names(result)).toEqual(["root"]);
  });
});
