import { describe, expect, it } from "vitest";
import { createNode, type DocNode } from "../src/model/node.js";
import {
  createBulkDuplicateCommand,
  createBulkInsertCommand,
  createBulkMoveCommand,
  createBulkRemoveCommand,
  topmostRows,
  type BulkRow,
} from "../src/commands/bulk.js";

/** Builds `root` with the given named children and returns rows for each, mirroring what the
 * UI's flattened tree hands to these functions. */
function flatTree(...names: string[]): { root: DocNode; rows: BulkRow[] } {
  const children = names.map((name) => createNode({ name }));
  const root = createNode({ name: "root", children });
  return { root, rows: children.map((node) => ({ node, ancestors: [root] })) };
}

function names(node: DocNode): string[] {
  return node.children.map((child) => child.name);
}

const noDoc = undefined as never;

describe("topmostRows", () => {
  it("drops a row whose ancestor is also selected", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });
    const root = createNode({ name: "root", children: [parent] });

    const result = topmostRows([
      { node: parent, ancestors: [root] },
      { node: child, ancestors: [root, parent] },
    ]);

    expect(result.map((row) => row.node.name)).toEqual(["parent"]);
  });

  it("keeps unrelated rows from different branches", () => {
    const { rows } = flatTree("a", "b");
    expect(topmostRows(rows)).toHaveLength(2);
  });
});

describe("createBulkRemoveCommand", () => {
  it("removes several siblings as one step and undo restores their exact positions", () => {
    const { root, rows } = flatTree("a", "b", "c", "d");
    const command = createBulkRemoveCommand([rows[0]!, rows[2]!])!;

    command.do(noDoc);
    expect(names(root)).toEqual(["b", "d"]);

    command.undo(noDoc);
    expect(names(root)).toEqual(["a", "b", "c", "d"]);
  });

  it("removes across different parents", () => {
    const x = createNode({ name: "x" });
    const z = createNode({ name: "z" });
    const p1 = createNode({ name: "p1", children: [x] });
    const p2 = createNode({ name: "p2", children: [z] });
    const root = createNode({ name: "root", children: [p1, p2] });

    const command = createBulkRemoveCommand([
      { node: x, ancestors: [root, p1] },
      { node: z, ancestors: [root, p2] },
    ])!;

    command.do(noDoc);
    expect(names(p1)).toEqual([]);
    expect(names(p2)).toEqual([]);

    command.undo(noDoc);
    expect(names(p1)).toEqual(["x"]);
    expect(names(p2)).toEqual(["z"]);
  });

  it("does not remove a child twice when its parent is selected as well", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });
    const root = createNode({ name: "root", children: [parent] });

    const command = createBulkRemoveCommand([
      { node: parent, ancestors: [root] },
      { node: child, ancestors: [root, parent] },
    ])!;

    command.do(noDoc);
    expect(names(root)).toEqual([]);

    command.undo(noDoc);
    expect(names(root)).toEqual(["parent"]);
    expect(names(parent)).toEqual(["child"]);
  });

  it("returns null for an empty selection and for the root alone", () => {
    const root = createNode({ name: "root" });
    expect(createBulkRemoveCommand([])).toBeNull();
    expect(createBulkRemoveCommand([{ node: root, ancestors: [] }])).toBeNull();
  });
});

describe("createBulkDuplicateCommand", () => {
  it("inserts a copy after each selected node as one step", () => {
    const { root, rows } = flatTree("a", "b", "c");
    const result = createBulkDuplicateCommand([rows[0]!, rows[2]!])!;

    result.command.do(noDoc);
    expect(names(root)).toEqual(["a", "a", "b", "c", "c"]);

    result.command.undo(noDoc);
    expect(names(root)).toEqual(["a", "b", "c"]);
  });

  it("returns fresh clones, not the originals", () => {
    const { rows } = flatTree("a");
    const result = createBulkDuplicateCommand([rows[0]!])!;

    expect(result.clones).toHaveLength(1);
    expect(result.clones[0]!.id).not.toBe(rows[0]!.node.id);
  });

  it("returns null when nothing is duplicable", () => {
    expect(createBulkDuplicateCommand([])).toBeNull();
  });
});

describe("createBulkInsertCommand", () => {
  it("inserts several nodes consecutively at one spot", () => {
    const { root } = flatTree("a", "d");
    const inserted = [createNode({ name: "b" }), createNode({ name: "c" })];
    const command = createBulkInsertCommand(root, 1, inserted, [])!;

    command.do(noDoc);
    expect(names(root)).toEqual(["a", "b", "c", "d"]);

    command.undo(noDoc);
    expect(names(root)).toEqual(["a", "d"]);
  });

  it("returns null for an empty node list", () => {
    const root = createNode({ name: "root" });
    expect(createBulkInsertCommand(root, 0, [], [])).toBeNull();
  });
});

describe("createBulkMoveCommand", () => {
  it("moves a block of siblings to the end, keeping their relative order", () => {
    const { root, rows } = flatTree("a", "b", "c", "d");
    const command = createBulkMoveCommand([rows[0]!, rows[2]!], rows[3]!, "after")!;

    command.do(noDoc);
    expect(names(root)).toEqual(["b", "d", "a", "c"]);

    command.undo(noDoc);
    expect(names(root)).toEqual(["a", "b", "c", "d"]);
  });

  it("moves nodes from different parents into one target", () => {
    const x = createNode({ name: "x" });
    const y = createNode({ name: "y" });
    const z = createNode({ name: "z" });
    const p1 = createNode({ name: "p1", children: [x, y] });
    const p2 = createNode({ name: "p2", children: [z] });
    const root = createNode({ name: "root", children: [p1, p2] });

    const command = createBulkMoveCommand(
      [
        { node: x, ancestors: [root, p1] },
        { node: z, ancestors: [root, p2] },
      ],
      { node: p1, ancestors: [root] },
      "into",
    )!;

    command.do(noDoc);
    expect(names(p1)).toEqual(["y", "x", "z"]);
    expect(names(p2)).toEqual([]);

    command.undo(noDoc);
    expect(names(p1)).toEqual(["x", "y"]);
    expect(names(p2)).toEqual(["z"]);
  });

  it("moving a block upwards lands it before the anchor", () => {
    const { root, rows } = flatTree("a", "b", "c", "d");
    const command = createBulkMoveCommand([rows[2]!, rows[3]!], rows[0]!, "before")!;

    command.do(noDoc);
    expect(names(root)).toEqual(["c", "d", "a", "b"]);

    command.undo(noDoc);
    expect(names(root)).toEqual(["a", "b", "c", "d"]);
  });

  it("refuses to drop a selection into its own subtree", () => {
    const inner = createNode({ name: "inner" });
    const outer = createNode({ name: "outer", children: [inner] });
    const other = createNode({ name: "other" });
    const root = createNode({ name: "root", children: [outer, other] });

    const command = createBulkMoveCommand(
      [
        { node: outer, ancestors: [root] },
        { node: other, ancestors: [root] },
      ],
      { node: inner, ancestors: [root, outer] },
      "into",
    );

    expect(command).toBeNull();
  });

  it("refuses to drop a selection into one of its own members", () => {
    const { rows } = flatTree("a", "b");
    expect(createBulkMoveCommand([rows[0]!, rows[1]!], rows[0]!, "into")).toBeNull();
  });

  it("a single source behaves exactly like planMove, including its no-op detection", () => {
    const { root, rows } = flatTree("a", "b");

    expect(createBulkMoveCommand([rows[0]!], rows[0]!, "before")).toBeNull(); // no-op

    const command = createBulkMoveCommand([rows[0]!], rows[1]!, "after")!;
    command.do(noDoc);
    expect(names(root)).toEqual(["b", "a"]);
    command.undo(noDoc);
    expect(names(root)).toEqual(["a", "b"]);
  });

  it("returns null for an empty selection", () => {
    const { rows } = flatTree("a");
    expect(createBulkMoveCommand([], rows[0]!, "into")).toBeNull();
  });
});
