import { describe, expect, it } from "vitest";
import { captureChangeBaseline, computeChanges } from "../src/changes/diff.js";
import { createNode } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";

function tryFindByName(root: DocNode, name: string): DocNode | null {
  if (root.name === name) return root;
  for (const child of root.children) {
    const found = tryFindByName(child, name);
    if (found) return found;
  }
  return null;
}

function findByName(root: DocNode, name: string): DocNode {
  const found = tryFindByName(root, name);
  if (!found) throw new Error(`node "${name}" not found`);
  return found;
}

function sampleTree(): DocNode {
  return createNode({
    name: "catalog",
    children: [
      createNode({ name: "a", value: "1" }),
      createNode({ name: "b", value: "2" }),
      createNode({ name: "c", value: "3" }),
      createNode({ name: "d", value: "4" }),
    ],
  });
}

describe("computeChanges", () => {
  it("reports no changes against its own baseline", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);

    const changes = computeChanges(root, baseline);

    expect(changes.modified.size).toBe(0);
    expect(changes.added.size).toBe(0);
    expect(changes.containsChange.size).toBe(0);
    expect(changes.tombstones).toHaveLength(0);
    expect(changes.truncated).toBe(false);
  });

  it("detects a value change as modified and bubbles containsChange to ancestors", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const a = findByName(root, "a");
    a.value = "CHANGED";

    const changes = computeChanges(root, baseline);

    expect(changes.modified.has(a.id)).toBe(true);
    expect(changes.containsChange.has(root.id)).toBe(true);
    expect(changes.added.size).toBe(0);
  });

  it("detects an attribute change as modified", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const a = findByName(root, "a");
    a.attributes.push({ name: "id", value: "1" });

    const changes = computeChanges(root, baseline);

    expect(changes.modified.has(a.id)).toBe(true);
  });

  it("detects a rename (name change) as modified", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const a = findByName(root, "a");
    a.name = "renamed";

    const changes = computeChanges(root, baseline);

    expect(changes.modified.has(a.id)).toBe(true);
  });

  it("detects a freshly inserted node as added, not modified", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const fresh = createNode({ name: "e", value: "5" });
    root.children.push(fresh);

    const changes = computeChanges(root, baseline);

    expect(changes.added.has(fresh.id)).toBe(true);
    expect(changes.modified.has(fresh.id)).toBe(false);
    expect(changes.containsChange.has(root.id)).toBe(true);
  });

  it("does not mark a merely moved (reordered) node as modified", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const [a, b] = root.children;
    root.children[0] = b!;
    root.children[1] = a!;

    const changes = computeChanges(root, baseline);

    expect(changes.modified.size).toBe(0);
    expect(changes.added.size).toBe(0);
  });

  it("creates a tombstone anchored to the previous surviving sibling when a middle node is deleted", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const b = findByName(root, "b");
    root.children = root.children.filter((c) => c !== b);

    const changes = computeChanges(root, baseline);

    expect(changes.tombstones).toHaveLength(1);
    const tombstone = changes.tombstones[0]!;
    expect(tombstone.id).toBe(b.id);
    expect(tombstone.name).toBe("b");
    expect(tombstone.parentId).toBe(root.id);
    expect(tombstone.anchorPreviousSiblingId).toBe(findByName(root, "a").id);
    expect(changes.containsChange.has(root.id)).toBe(true);
  });

  it("anchors a tombstone to null when the first child is deleted", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const a = findByName(root, "a");
    root.children = root.children.filter((c) => c !== a);

    const changes = computeChanges(root, baseline);

    expect(changes.tombstones[0]!.anchorPreviousSiblingId).toBeNull();
  });

  it("keeps consecutive deletions anchored to the same surviving sibling, ordered by baselineIndex", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    const b = findByName(root, "b");
    const c = findByName(root, "c");
    root.children = root.children.filter((node) => node !== b && node !== c);

    const changes = computeChanges(root, baseline);

    expect(changes.tombstones).toHaveLength(2);
    const anchorA = findByName(root, "a").id;
    expect(changes.tombstones.every((t) => t.anchorPreviousSiblingId === anchorA)).toBe(true);
    const [first, second] = [...changes.tombstones].sort((x, y) => x.baselineIndex - y.baselineIndex);
    expect(first!.name).toBe("b");
    expect(second!.name).toBe("c");
  });

  it("collapses a deleted subtree to a single tombstone, not one per descendant", () => {
    const root = createNode({
      name: "root",
      children: [
        createNode({
          name: "parent",
          children: [createNode({ name: "child1", value: "x" }), createNode({ name: "child2", value: "y" })],
        }),
      ],
    });
    const baseline = captureChangeBaseline(root);
    const parent = findByName(root, "parent");
    root.children = root.children.filter((c) => c !== parent);

    const changes = computeChanges(root, baseline);

    expect(changes.tombstones).toHaveLength(1);
    expect(changes.tombstones[0]!.name).toBe("parent");
    expect(changes.tombstones[0]!.childCount).toBe(2);
  });

  it("does not mark an ancestor as containsChange if it is itself already added/modified", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    root.value = "root changed"; // root itself modified
    const a = findByName(root, "a");
    a.value = "CHANGED"; // descendant also modified

    const changes = computeChanges(root, baseline);

    expect(changes.modified.has(root.id)).toBe(true);
    expect(changes.containsChange.has(root.id)).toBe(false);
  });

  it("truncates when the number of changes exceeds maxChanges", () => {
    const root = sampleTree();
    const baseline = captureChangeBaseline(root);
    for (const child of root.children) child.value = "changed";

    const changes = computeChanges(root, baseline, 2);

    expect(changes.truncated).toBe(true);
    expect(changes.modified.size).toBe(0);
    expect(changes.tombstones).toHaveLength(0);
  });
});
