import { describe, expect, it } from "vitest";
import { createDocument } from "../src/model/document.js";
import { createNode } from "../src/model/node.js";
import type { DocNode } from "../src/model/node.js";
import { CommandBus } from "../src/commands/command-bus.js";
import type { Command } from "../src/commands/command.js";
import { createCompositeCommand } from "../src/commands/composite.js";

function setValueCommand(node: DocNode, next: string, byteRangeChain: DocNode[] = [], coalesceKey?: string): Command {
  let previous: string | null = null;
  return {
    label: "set-value",
    byteRangeChain,
    coalesceKey,
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

  it("is not dirty initially, becomes dirty on execute, and clean again after markSaved", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    expect(bus.isDirty()).toBe(false);
    bus.execute(setValueCommand(root, "b"));
    expect(bus.isDirty()).toBe(true);

    bus.markSaved();
    expect(bus.isDirty()).toBe(false);
  });

  it("becomes clean again when undo returns exactly to the saved baseline", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    bus.execute(setValueCommand(root, "b"));
    bus.markSaved();
    bus.execute(setValueCommand(root, "c"));
    expect(bus.isDirty()).toBe(true);

    bus.undo();
    expect(bus.isDirty()).toBe(false);

    bus.redo();
    expect(bus.isDirty()).toBe(true);
  });

  it("stays dirty if undo passes the saved baseline entirely", () => {
    const root = createNode({ name: "root", value: "a" });
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    bus.execute(setValueCommand(root, "b"));
    bus.execute(setValueCommand(root, "c"));
    bus.markSaved(); // baseline at depth 2
    bus.undo(); // depth 1
    bus.undo(); // depth 0

    expect(bus.isDirty()).toBe(true);
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

  describe("byteRange-Lebenszyklus (Command.byteRangeChain)", () => {
    it("löscht die Kette bei execute() und stellt sie beim Undo wieder her", () => {
      const parent = createNode({ name: "p", byteRange: [0, 50] });
      const node = createNode({ name: "n", value: "a", byteRange: [10, 20] });
      const doc = createDocument({ format: "xml", root: parent });
      const bus = new CommandBus(doc);

      bus.execute(setValueCommand(node, "b", [parent, node]));
      expect(node.byteRange).toBeUndefined();
      expect(parent.byteRange).toBeUndefined();

      bus.undo();
      expect(node.byteRange).toEqual([10, 20]);
      expect(parent.byteRange).toEqual([0, 50]);
    });

    it("stellt eine erfasste byteRange NICHT wieder her, wenn dazwischen gespeichert wurde (Save-Epoche)", () => {
      const node = createNode({ name: "n", value: "a", byteRange: [10, 20] });
      const doc = createDocument({ format: "xml", root: node });
      const bus = new CommandBus(doc);

      bus.execute(setValueCommand(node, "b", [node]));
      expect(node.byteRange).toBeUndefined();

      bus.markSaved(); // sourceText auf Platte hat sich geändert — Epoche erhöht sich

      bus.undo();
      expect(node.value).toBe("a"); // Modell korrekt zurückgedreht
      expect(node.byteRange).toBeUndefined(); // aber KEINE veraltete byteRange wiederhergestellt
    });

    it("redo löscht die Kette erneut, ohne dass eine neue Erfassung nötig ist", () => {
      const node = createNode({ name: "n", value: "a", byteRange: [10, 20] });
      const doc = createDocument({ format: "xml", root: node });
      const bus = new CommandBus(doc);

      bus.execute(setValueCommand(node, "b", [node]));
      bus.undo();
      expect(node.byteRange).toEqual([10, 20]);

      bus.redo();
      expect(node.value).toBe("b");
      expect(node.byteRange).toBeUndefined();

      bus.undo();
      expect(node.byteRange).toEqual([10, 20]); // Wiederherstellung funktioniert auch nach redo
    });

    it("Composite aggregiert byteRangeChain aus allen Sub-Commands", () => {
      const a = createNode({ name: "a", value: "1", byteRange: [0, 5] });
      const b = createNode({ name: "b", value: "2", byteRange: [5, 10] });
      const doc = createDocument({ format: "xml", root: a });
      const bus = new CommandBus(doc);

      const composite = createCompositeCommand("multi", [
        setValueCommand(a, "X", [a]),
        setValueCommand(b, "Y", [b]),
      ]);
      expect(composite.byteRangeChain).toEqual([a, b]);

      bus.execute(composite);
      expect(a.byteRange).toBeUndefined();
      expect(b.byteRange).toBeUndefined();

      bus.undo();
      expect(a.byteRange).toEqual([0, 5]);
      expect(b.byteRange).toEqual([5, 10]);
    });

    it("Coalescing übernimmt die ursprünglich (vor dem ersten Tastendruck) erfasste byteRange", () => {
      const node = createNode({ name: "n", value: "", byteRange: [10, 20] });
      const doc = createDocument({ format: "xml", root: node });
      const bus = new CommandBus(doc);
      const key = "typing";

      bus.execute(setValueCommand(node, "a", [node], key));
      bus.execute(setValueCommand(node, "ab", [node], key));
      bus.execute(setValueCommand(node, "abc", [node], key));
      expect(node.byteRange).toBeUndefined();
      expect(bus.canUndo()).toBe(true);

      bus.undo(); // EIN Schritt für die ganze Tippkette
      expect(node.value).toBe("");
      expect(node.byteRange).toEqual([10, 20]); // aus der Erfassung VOR dem ersten Tastendruck
    });
  });
});
