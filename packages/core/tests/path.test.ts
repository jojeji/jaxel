import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";
import { computePaths, formatIndexedPath, formatStaticPath, getPathSegments } from "../src/format/path.js";

/**
 * Builds the shared test tree:
 *
 * catalog
 *   person (x3)
 *     person[1]: name (x1), tags (x2)
 *   settings (x1)
 *     theme (x1)
 */
function buildCatalogTree() {
  const person1Name = createNode({ name: "name", value: "Bob" });
  const person1Tags = [createNode({ name: "tags", value: "a" }), createNode({ name: "tags", value: "b" })];
  const person0 = createNode({ name: "person" });
  const person1 = createNode({ name: "person", children: [person1Name, ...person1Tags] });
  const person2 = createNode({ name: "person" });
  const theme = createNode({ name: "theme", value: "dark" });
  const settings = createNode({ name: "settings", children: [theme] });
  const root = createNode({ name: "catalog", children: [person0, person1, person2, settings] });

  return { root, person0, person1, person2, person1Name, person1Tags, settings, theme };
}

/** Ancestor chain lookup helper mirroring how a caller (e.g. the tree UI) would find
 * ancestors of a known node before calling getPathSegments/formatXPath directly. */
function findAncestors(root: DocNode, target: DocNode): DocNode[] {
  function search(node: DocNode, path: DocNode[]): DocNode[] | null {
    if (node === target) return path;
    for (const child of node.children) {
      const found = search(child, [...path, node]);
      if (found) return found;
    }
    return null;
  }
  const result = search(root, []);
  if (result === null) throw new Error("target not found");
  return result;
}

describe("path", () => {
  it("computes the indexed and static path for person[1].name", () => {
    const { root, person1Name } = buildCatalogTree();
    const { indexed, static: staticPath } = computePaths(root, person1Name);

    expect(indexed).toBe("person[1].name");
    expect(staticPath).toBe("person.name");
  });

  it("computes the indexed and static path for person[1].tags[1]", () => {
    const { root, person1Tags } = buildCatalogTree();
    const secondTags = person1Tags[1]!;
    const { indexed, static: staticPath } = computePaths(root, secondTags);

    expect(indexed).toBe("person[1].tags[1]");
    expect(staticPath).toBe("person.tags");
  });

  it("omits [0] for uniquely-named nodes in both path flavors", () => {
    const { root, theme } = buildCatalogTree();
    const { indexed, static: staticPath } = computePaths(root, theme);

    expect(indexed).toBe("settings.theme");
    expect(staticPath).toBe("settings.theme");
  });

  it("returns just the root name when target is the root itself", () => {
    const { root } = buildCatalogTree();
    const segments = getPathSegments(root, []);

    expect(segments).toEqual([{ name: "catalog", indexAmongSameName: 0, hasSiblingsWithSameName: false }]);
    expect(formatIndexedPath(segments)).toBe("catalog");
    expect(formatStaticPath(segments)).toBe("catalog");

    const { indexed, static: staticPath } = computePaths(root, root);
    expect(indexed).toBe("catalog");
    expect(staticPath).toBe("catalog");
  });

  it("throws when target is not a descendant of root", () => {
    const { root } = buildCatalogTree();
    const stranger = createNode({ name: "stranger" });

    expect(() => computePaths(root, stranger)).toThrow();
  });

  it("computes a correct path for a deeply nested node with mixed unique/duplicate names", () => {
    const leaf = createNode({ name: "value", value: "42" });
    const item1 = createNode({ name: "item", children: [leaf] });
    const item0 = createNode({ name: "item" });
    const group = createNode({ name: "group", children: [item0, item1] });
    const uniqueChild = createNode({ name: "wrapper", children: [group] });
    const root = createNode({ name: "root", children: [uniqueChild] });

    const { indexed, static: staticPath } = computePaths(root, leaf);

    expect(indexed).toBe("wrapper.group.item[1].value");
    expect(staticPath).toBe("wrapper.group.item.value");

    // Sanity-check getPathSegments directly using an externally-derived ancestor chain.
    const ancestors = findAncestors(root, leaf);
    const segments = getPathSegments(leaf, ancestors);
    expect(formatIndexedPath(segments)).toBe(indexed);
    expect(formatStaticPath(segments)).toBe(staticPath);
  });
});
