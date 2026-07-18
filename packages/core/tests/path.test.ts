import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";
import {
  computePaths,
  findNodeById,
  formatIndexedPath,
  formatStaticPath,
  getPathSegments,
  resolveNodeBySegments,
} from "../src/format/path.js";
import { parseXml } from "../src/format/xml-import.js";

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

describe("findNodeById", () => {
  it("findet einen tief verschachtelten Knoten anhand seiner Id", () => {
    const { root, theme } = buildCatalogTree();
    expect(findNodeById(root, theme.id)).toBe(theme);
  });

  it("findet die Wurzel selbst", () => {
    const { root } = buildCatalogTree();
    expect(findNodeById(root, root.id)).toBe(root);
  });

  it("liefert null fuer eine unbekannte Id", () => {
    const { root } = buildCatalogTree();
    expect(findNodeById(root, "unbekannte-id")).toBeNull();
  });
});

describe("resolveNodeBySegments", () => {
  it("findet den entsprechenden Knoten in einem frisch geparsten (andere Ids habenden) Baum", () => {
    const original = buildCatalogTree();
    const segments = getPathSegments(original.theme, [original.root, original.settings]);

    // Frisch neu aufgebauter Baum mit denselben Namen, aber komplett neuen Node-Ids.
    const fresh = buildCatalogTree();
    expect(fresh.theme.id).not.toBe(original.theme.id);

    const resolved = resolveNodeBySegments(fresh.root, segments);
    expect(resolved).toBe(fresh.theme);
  });

  it("liefert null, wenn der Pfad im neuen Baum nicht mehr existiert", () => {
    const { root } = buildCatalogTree();
    const segments = [
      { name: "catalog", indexAmongSameName: 0, hasSiblingsWithSameName: false },
      { name: "nichtvorhanden", indexAmongSameName: 0, hasSiblingsWithSameName: false },
    ];
    expect(resolveNodeBySegments(root, segments)).toBeNull();
  });

  it("liefert die Wurzel selbst bei einer Ein-Element-Segmentkette", () => {
    const { root } = buildCatalogTree();
    const segments = getPathSegments(root, []);
    expect(resolveNodeBySegments(root, segments)).toBe(root);
  });
});

describe("formatFullPath (vollstaendiger Pfad)", () => {
  it("enthaelt die Wurzel, nie Indizes, und schneidet Namespace-Praefixe ab", () => {
    const { root } = parseXml(
      "<Testkonten><unterknoten><ns:variable>x</ns:variable><ns:variable>y</ns:variable></unterknoten></Testkonten>",
    );
    const variable = root.children[0]!.children[1]!;
    const { full } = computePaths(root, variable);
    expect(full).toBe("Testkonten.unterknoten.variable");
  });

  it("Pfad zur Wurzel selbst ist nur der Wurzelname (ohne Praefix)", () => {
    const { root } = parseXml("<x:wurzel><kind/></x:wurzel>");
    expect(computePaths(root, root).full).toBe("wurzel");
    expect(computePaths(root, root.children[0]!).full).toBe("wurzel.kind");
  });
});
