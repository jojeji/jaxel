import { describe, expect, it } from "vitest";
import { createNode } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";
import {
  EMPTY_SELECTION,
  extendSelection,
  pruneSelection,
  selectOnly,
  selectRange,
  selectedRowsInOrder,
  selectionForActionOn,
  soleSelectedId,
  toggle,
  type Selection,
} from "./selection.js";

function row(node: ReturnType<typeof createNode>, ancestors: ReturnType<typeof createNode>[] = []): TreeRow {
  return { node, ancestors, depth: ancestors.length, hasChildren: node.children.length > 0 };
}

function nodes(count: number): ReturnType<typeof createNode>[] {
  return Array.from({ length: count }, (_, i) => createNode({ name: `n${i}` }));
}

function selection(ids: string[], anchorId: string | null = null, leadId: string | null = anchorId): Selection {
  return { ids: new Set(ids), anchorId, leadId };
}

describe("selectOnly", () => {
  it("selects exactly one node and makes it the anchor", () => {
    const result = selectOnly("a");
    expect([...result.ids]).toEqual(["a"]);
    expect(result.anchorId).toBe("a");
  });
});

describe("toggle", () => {
  it("adds an absent node", () => {
    const result = toggle(selection(["a"]), "b");
    expect([...result.ids].sort()).toEqual(["a", "b"]);
  });

  it("removes a present node", () => {
    const result = toggle(selection(["a", "b"]), "b");
    expect([...result.ids]).toEqual(["a"]);
  });

  it("makes the toggled node the anchor even when it was removed", () => {
    expect(toggle(selection(["a", "b"], "a"), "b").anchorId).toBe("b");
  });
});

describe("soleSelectedId", () => {
  it("returns the id only when exactly one node is selected", () => {
    expect(soleSelectedId(selection(["a"]))).toBe("a");
    expect(soleSelectedId(selection(["a", "b"]))).toBeNull();
    expect(soleSelectedId(EMPTY_SELECTION)).toBeNull();
  });
});

describe("selectRange", () => {
  it("selects every row between anchor and target inclusive, in row order", () => {
    const [a, b, c, d] = nodes(4) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c), row(d)];

    const result = selectRange(selection([a.id], a.id), rows, c.id);
    expect([...result.ids].sort()).toEqual([a.id, b.id, c.id].sort());
  });

  it("works upwards too (anchor below the target)", () => {
    const [a, b, c] = nodes(3) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c)];

    const result = selectRange(selection([c.id], c.id), rows, a.id);
    expect([...result.ids].sort()).toEqual([a.id, b.id, c.id].sort());
  });

  it("keeps the anchor so repeated shift-clicks re-span from the same origin", () => {
    const [a, b, c] = nodes(3) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c)];

    const first = selectRange(selection([a.id], a.id), rows, c.id);
    const second = selectRange(first, rows, b.id);
    expect(second.anchorId).toBe(a.id);
    expect([...second.ids].sort()).toEqual([a.id, b.id].sort());
  });

  it("replaces the previous selection rather than adding to it", () => {
    const [a, b, c, d] = nodes(4) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c), row(d)];

    const result = selectRange(selection([a.id, d.id], c.id), rows, d.id);
    expect([...result.ids].sort()).toEqual([c.id, d.id].sort());
  });

  it("falls back to a single selection when the anchor is not among the visible rows", () => {
    const [a, b] = nodes(2) as [ReturnType<typeof createNode>, ReturnType<typeof createNode>];
    const rows = [row(a), row(b)];

    const result = selectRange(selection([], "vanished"), rows, b.id);
    expect([...result.ids]).toEqual([b.id]);
    expect(result.anchorId).toBe(b.id);
  });
});

describe("extendSelection", () => {
  it("grows the range one row per step", () => {
    const [a, b, c] = nodes(3) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c)];

    const once = extendSelection(selectOnly(a.id), rows, 1);
    expect([...once.ids].sort()).toEqual([a.id, b.id].sort());

    const twice = extendSelection(once, rows, 1);
    expect([...twice.ids].sort()).toEqual([a.id, b.id, c.id].sort());
  });

  it("SHRINKS again when the direction reverses (this is what leadId is for)", () => {
    const [a, b, c] = nodes(3) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c)];

    const grown = extendSelection(extendSelection(selectOnly(a.id), rows, 1), rows, 1);
    const shrunk = extendSelection(grown, rows, -1);

    expect([...shrunk.ids].sort()).toEqual([a.id, b.id].sort());
  });

  it("stops at the ends of the list", () => {
    const [a, b] = nodes(2) as [ReturnType<typeof createNode>, ReturnType<typeof createNode>];
    const rows = [row(a), row(b)];

    const atEnd = extendSelection(selectOnly(b.id), rows, 1);
    expect([...atEnd.ids]).toEqual([b.id]);
  });

  it("with nothing selected, behaves like a plain arrow key onto the first/last row", () => {
    const [a, b] = nodes(2) as [ReturnType<typeof createNode>, ReturnType<typeof createNode>];
    const rows = [row(a), row(b)];

    expect([...extendSelection(EMPTY_SELECTION, rows, 1).ids]).toEqual([a.id]);
    expect([...extendSelection(EMPTY_SELECTION, rows, -1).ids]).toEqual([b.id]);
  });
});

describe("selectedRowsInOrder", () => {
  it("returns selected rows in visible order, not click order", () => {
    const [a, b, c] = nodes(3) as [
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
      ReturnType<typeof createNode>,
    ];
    const rows = [row(a), row(b), row(c)];

    const result = selectedRowsInOrder(selection([c.id, a.id]), rows);
    expect(result.map((r) => r.node.id)).toEqual([a.id, c.id]);
  });
});

describe("pruneSelection", () => {
  it("drops ids that are no longer visible", () => {
    const [a, b] = nodes(2) as [ReturnType<typeof createNode>, ReturnType<typeof createNode>];
    const rows = [row(a)];

    const result = pruneSelection(selection([a.id, b.id], a.id), rows);
    expect([...result.ids]).toEqual([a.id]);
  });

  it("clears an anchor that vanished, keeping the surviving ids", () => {
    const [a, b] = nodes(2) as [ReturnType<typeof createNode>, ReturnType<typeof createNode>];
    const rows = [row(a)];

    expect(pruneSelection(selection([a.id, b.id], b.id), rows).anchorId).toBeNull();
  });

  it("returns the SAME object when nothing changed (stable React state)", () => {
    const [a] = nodes(1) as [ReturnType<typeof createNode>];
    const rows = [row(a)];
    const current = selection([a.id], a.id);

    expect(pruneSelection(current, rows)).toBe(current);
  });
});

describe("selectionForActionOn", () => {
  it("keeps the whole selection when acting on an already-selected node", () => {
    const current = selection(["a", "b"], "a");
    expect(selectionForActionOn(current, "b")).toBe(current);
  });

  it("collapses to the single node when acting on an unselected one", () => {
    const result = selectionForActionOn(selection(["a", "b"], "a"), "c");
    expect([...result.ids]).toEqual(["c"]);
    expect(result.anchorId).toBe("c");
  });
});
