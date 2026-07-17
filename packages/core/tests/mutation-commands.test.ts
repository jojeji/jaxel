import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { createRenameCommand } from "../src/commands/rename.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { createSetAttributeCommand } from "../src/commands/set-attribute.js";
import { createInsertNodeCommand } from "../src/commands/insert-node.js";
import { createRemoveNodeCommand } from "../src/commands/remove-node.js";
import { createMoveNodeCommand } from "../src/commands/move-node.js";

describe("createRenameCommand", () => {
  it("renames and clears byteRange on the node AND every ancestor, undo restores both", () => {
    const grandparent = createNode({ name: "gp", byteRange: [0, 100] });
    const parent = createNode({ name: "p", byteRange: [10, 90] });
    const node = createNode({ name: "old", byteRange: [20, 30] });
    const command = createRenameCommand(node, "new", [grandparent, parent]);

    command.do(undefined as never);
    expect(node.name).toBe("new");
    expect(node.byteRange).toBeUndefined();
    expect(parent.byteRange).toBeUndefined();
    expect(grandparent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(node.name).toBe("old");
    expect(node.byteRange).toEqual([20, 30]);
    expect(parent.byteRange).toEqual([10, 90]);
    expect(grandparent.byteRange).toEqual([0, 100]);
  });
});

describe("createSetValueCommand", () => {
  it("sets value+jsonType and clears byteRange on the node and its ancestors, undo restores all", () => {
    const parent = createNode({ name: "p", byteRange: [0, 50] });
    const node = createNode({ name: "n", value: "1", jsonType: "number", byteRange: [0, 5] });
    const command = createSetValueCommand(node, "hello", "string", [parent]);

    command.do(undefined as never);
    expect(node.value).toBe("hello");
    expect(node.jsonType).toBe("string");
    expect(node.byteRange).toBeUndefined();
    expect(parent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(node.value).toBe("1");
    expect(node.jsonType).toBe("number");
    expect(node.byteRange).toEqual([0, 5]);
    expect(parent.byteRange).toEqual([0, 50]);
  });
});

describe("createSetAttributeCommand", () => {
  it("adds a new attribute, clears byteRange up the ancestor chain, undo restores it", () => {
    const parent = createNode({ name: "p", byteRange: [0, 50] });
    const node = createNode({ name: "n", byteRange: [0, 5] });
    const command = createSetAttributeCommand(node, "id", "P-1", [parent]);

    command.do(undefined as never);
    expect(node.attributes).toEqual([{ name: "id", value: "P-1" }]);
    expect(node.byteRange).toBeUndefined();
    expect(parent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(node.attributes).toEqual([]);
    expect(node.byteRange).toEqual([0, 5]);
    expect(parent.byteRange).toEqual([0, 50]);
  });

  it("changes an existing attribute value and undoes to the previous value", () => {
    const node = createNode({ name: "n", attributes: [{ name: "id", value: "P-1" }] });
    const command = createSetAttributeCommand(node, "id", "P-2", []);

    command.do(undefined as never);
    expect(node.attributes).toEqual([{ name: "id", value: "P-2" }]);

    command.undo(undefined as never);
    expect(node.attributes).toEqual([{ name: "id", value: "P-1" }]);
  });

  it("removes an attribute with value=null and undoes to restore it", () => {
    const node = createNode({ name: "n", attributes: [{ name: "id", value: "P-1" }] });
    const command = createSetAttributeCommand(node, "id", null, []);

    command.do(undefined as never);
    expect(node.attributes).toEqual([]);

    command.undo(undefined as never);
    expect(node.attributes).toEqual([{ name: "id", value: "P-1" }]);
  });
});

describe("createInsertNodeCommand / createRemoveNodeCommand", () => {
  it("inserts a child at an index, invalidating byteRange up the ancestor chain, and undo removes it again", () => {
    const grandparent = createNode({ name: "gp", byteRange: [0, 200] });
    const parent = createNode({ name: "parent", byteRange: [0, 20] });
    const child = createNode({ name: "child" });
    const command = createInsertNodeCommand(parent, 0, child, [grandparent]);

    command.do(undefined as never);
    expect(parent.children).toEqual([child]);
    expect(parent.byteRange).toBeUndefined();
    expect(grandparent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(parent.children).toEqual([]);
    expect(parent.byteRange).toEqual([0, 20]);
    expect(grandparent.byteRange).toEqual([0, 200]);
  });

  it("removes a child at an index and undo re-inserts the same node instance", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child], byteRange: [0, 20] });
    const command = createRemoveNodeCommand(parent, 0, []);

    command.do(undefined as never);
    expect(parent.children).toEqual([]);
    expect(parent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(parent.children).toEqual([child]);
    expect(parent.byteRange).toEqual([0, 20]);
  });
});

describe("createMoveNodeCommand", () => {
  it("reorders within the same parent, invalidates that parent's ancestor chain, and undo restores original order", () => {
    const grandparent = createNode({ name: "gp", byteRange: [0, 200] });
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const c = createNode({ name: "c" });
    const parent = createNode({ name: "parent", children: [a, b, c], byteRange: [0, 30] });

    // Move "a" (index 0) to after "b": target index is 1 in the post-removal array [b, c].
    const command = createMoveNodeCommand(parent, 0, [grandparent], parent, 1, [grandparent]);

    command.do(undefined as never);
    expect(parent.children).toEqual([b, a, c]);
    expect(parent.byteRange).toBeUndefined();
    expect(grandparent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(parent.children).toEqual([a, b, c]);
    expect(parent.byteRange).toEqual([0, 30]);
    expect(grandparent.byteRange).toEqual([0, 200]);
  });

  it("moves a node across two different parents (each with its own ancestor chain) and undo moves it back", () => {
    const sourceGrandparent = createNode({ name: "sgp", byteRange: [0, 100] });
    const targetGrandparent = createNode({ name: "tgp", byteRange: [100, 200] });
    const child = createNode({ name: "child" });
    const sourceParent = createNode({ name: "source", children: [child], byteRange: [0, 10] });
    const targetParent = createNode({ name: "target", children: [], byteRange: [10, 20] });
    const command = createMoveNodeCommand(
      sourceParent,
      0,
      [sourceGrandparent],
      targetParent,
      0,
      [targetGrandparent],
    );

    command.do(undefined as never);
    expect(sourceParent.children).toEqual([]);
    expect(targetParent.children).toEqual([child]);
    expect(sourceParent.byteRange).toBeUndefined();
    expect(targetParent.byteRange).toBeUndefined();
    expect(sourceGrandparent.byteRange).toBeUndefined();
    expect(targetGrandparent.byteRange).toBeUndefined();

    command.undo(undefined as never);
    expect(sourceParent.children).toEqual([child]);
    expect(targetParent.children).toEqual([]);
    expect(sourceParent.byteRange).toEqual([0, 10]);
    expect(targetParent.byteRange).toEqual([10, 20]);
    expect(sourceGrandparent.byteRange).toEqual([0, 100]);
    expect(targetGrandparent.byteRange).toEqual([100, 200]);
  });
});
