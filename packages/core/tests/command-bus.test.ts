import { describe, expect, it } from "vitest";
import { createDocument } from "../src/model/document.js";
import { createNode } from "../src/model/node.js";
import { CommandBus } from "../src/commands/command-bus.js";
import type { Command } from "../src/commands/command.js";
import { createCompositeCommand } from "../src/commands/composite.js";

function setValueCommand(node: { value: string | null }, next: string): Command {
  let previous: string | null = null;
  return {
    label: "set-value",
    do() {
      previous = node.value;
      node.value = next;
    },
    undo() {
      node.value = previous;
    },
  };
}

describe("CommandBus", () => {
  it("executes a command and bumps the revision", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    bus.execute(setValueCommand(root, "b"));

    expect(root.value).toBe("b");
    expect(doc.revision).toBe(1);
  });

  it("undoes and redoes a command", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    bus.execute(setValueCommand(root, "b"));
    bus.undo();
    expect(root.value).toBe("a");
    expect(bus.canRedo()).toBe(true);

    bus.redo();
    expect(root.value).toBe("b");
  });

  it("clears the redo stack on a new execute", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    bus.execute(setValueCommand(root, "b"));
    bus.undo();
    bus.execute(setValueCommand(root, "c"));

    expect(bus.canRedo()).toBe(false);
    expect(root.value).toBe("c");
  });

  it("treats a composite command as a single undo step", () => {
    const root = createNode({ name: "root", value: "a" });
    const child = createNode({ name: "child", value: "x" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    const composite = createCompositeCommand("rename+set", [
      setValueCommand(root, "b"),
      setValueCommand(child, "y"),
    ]);

    bus.execute(composite);
    expect(root.value).toBe("b");
    expect(child.value).toBe("y");

    bus.undo();
    expect(root.value).toBe("a");
    expect(child.value).toBe("x");
  });

  it("notifies subscribers on execute/undo/redo", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);
    let notifications = 0;
    bus.subscribe(() => notifications++);

    bus.execute(setValueCommand(root, "b"));
    bus.undo();
    bus.redo();

    expect(notifications).toBe(3);
  });
});
