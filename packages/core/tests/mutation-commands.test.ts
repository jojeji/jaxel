import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { createRenameCommand } from "../src/commands/rename.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { createSetAttributeCommand } from "../src/commands/set-attribute.js";
import { createInsertNodeCommand } from "../src/commands/insert-node.js";
import { createRemoveNodeCommand } from "../src/commands/remove-node.js";
import { createMoveNodeCommand } from "../src/commands/move-node.js";

// byteRange invalidation/restoration is CommandBus's job now (see command-bus.test.ts,
// "byteRange-Lebenszyklus") — these tests only cover each command's own raw mutation via
// direct do()/undo() calls, which is all a command factory is still responsible for.

describe("createRenameCommand", () => {
  it("renames, undo restores the previous name", () => {
    const node = createNode({ name: "old" });
    const command = createRenameCommand(node, "new", []);

    command.do(undefined as never);
    expect(node.name).toBe("new");

    command.undo(undefined as never);
    expect(node.name).toBe("old");
  });

  it("declares the ancestor chain (with node appended) as byteRangeChain", () => {
    const grandparent = createNode({ name: "gp" });
    const parent = createNode({ name: "p" });
    const node = createNode({ name: "old" });
    const command = createRenameCommand(node, "new", [grandparent, parent]);

    expect(command.byteRangeChain).toEqual([grandparent, parent, node]);
  });
});

describe("createSetValueCommand", () => {
  it("sets value+jsonType, undo restores both", () => {
    const node = createNode({ name: "n", value: "1", jsonType: "number" });
    const command = createSetValueCommand(node, "hello", "string", []);

    command.do(undefined as never);
    expect(node.value).toBe("hello");
    expect(node.jsonType).toBe("string");

    command.undo(undefined as never);
    expect(node.value).toBe("1");
    expect(node.jsonType).toBe("number");
  });
});

describe("createSetAttributeCommand", () => {
  it("adds a new attribute, undo removes it", () => {
    const node = createNode({ name: "n" });
    const command = createSetAttributeCommand(node, "id", "P-1", []);

    command.do(undefined as never);
    expect(node.attributes).toEqual([{ name: "id", value: "P-1" }]);

    command.undo(undefined as never);
    expect(node.attributes).toEqual([]);
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
  it("inserts a child at an index, undo removes it again", () => {
    const parent = createNode({ name: "parent" });
    const child = createNode({ name: "child" });
    const command = createInsertNodeCommand(parent, 0, child, []);

    command.do(undefined as never);
    expect(parent.children).toEqual([child]);

    command.undo(undefined as never);
    expect(parent.children).toEqual([]);
  });

  it("removes a child at an index and undo re-inserts the same node instance", () => {
    const child = createNode({ name: "child" });
    const parent = createNode({ name: "parent", children: [child] });
    const command = createRemoveNodeCommand(parent, 0, []);

    command.do(undefined as never);
    expect(parent.children).toEqual([]);

    command.undo(undefined as never);
    expect(parent.children).toEqual([child]);
  });
});

describe("createMoveNodeCommand", () => {
  it("reorders within the same parent, undo restores original order", () => {
    const a = createNode({ name: "a" });
    const b = createNode({ name: "b" });
    const c = createNode({ name: "c" });
    const parent = createNode({ name: "parent", children: [a, b, c] });

    // Move "a" (index 0) to after "b": target index is 1 in the post-removal array [b, c].
    const command = createMoveNodeCommand(parent, 0, [], parent, 1, []);

    command.do(undefined as never);
    expect(parent.children).toEqual([b, a, c]);

    command.undo(undefined as never);
    expect(parent.children).toEqual([a, b, c]);
  });

  it("moves a node across two different parents and undo moves it back", () => {
    const child = createNode({ name: "child" });
    const sourceParent = createNode({ name: "source", children: [child] });
    const targetParent = createNode({ name: "target", children: [] });
    const command = createMoveNodeCommand(sourceParent, 0, [], targetParent, 0, []);

    command.do(undefined as never);
    expect(sourceParent.children).toEqual([]);
    expect(targetParent.children).toEqual([child]);

    command.undo(undefined as never);
    expect(sourceParent.children).toEqual([child]);
    expect(targetParent.children).toEqual([]);
  });

  it("declares the union of source and target ancestor chains as byteRangeChain", () => {
    const sourceGrandparent = createNode({ name: "sgp" });
    const targetGrandparent = createNode({ name: "tgp" });
    const sourceParent = createNode({ name: "source" });
    const targetParent = createNode({ name: "target" });
    const command = createMoveNodeCommand(
      sourceParent,
      0,
      [sourceGrandparent],
      targetParent,
      0,
      [targetGrandparent],
    );

    expect(command.byteRangeChain).toEqual([sourceGrandparent, sourceParent, targetGrandparent, targetParent]);
  });
});
