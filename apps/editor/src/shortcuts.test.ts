import { describe, expect, it } from "vitest";
import { resolveShortcut, type ShortcutContext, type ShortcutKeyInfo } from "./shortcuts.js";

const noSelection: ShortcutContext = { hasSelection: false, selectionHasChildren: false };
const leafSelected: ShortcutContext = { hasSelection: true, selectionHasChildren: false };
const branchSelected: ShortcutContext = { hasSelection: true, selectionHasChildren: true };

function key(partial: Partial<ShortcutKeyInfo> & { key: string }): ShortcutKeyInfo {
  return { ctrlKey: false, metaKey: false, shiftKey: false, code: "", ...partial };
}

describe("resolveShortcut", () => {
  it("Ctrl+S saves regardless of selection", () => {
    expect(resolveShortcut(key({ key: "s", ctrlKey: true }), noSelection)).toBe("save");
  });

  it("Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y both redo", () => {
    expect(resolveShortcut(key({ key: "z", ctrlKey: true }), noSelection)).toBe("undo");
    expect(resolveShortcut(key({ key: "z", ctrlKey: true, shiftKey: true }), noSelection)).toBe("redo");
    expect(resolveShortcut(key({ key: "y", ctrlKey: true }), noSelection)).toBe("redo");
  });

  it("also accepts Cmd (metaKey) as the modifier", () => {
    expect(resolveShortcut(key({ key: "s", metaKey: true }), noSelection)).toBe("save");
  });

  it("F2 renames only with a selection", () => {
    expect(resolveShortcut(key({ key: "F2" }), leafSelected)).toBe("renameStart");
    expect(resolveShortcut(key({ key: "F2" }), noSelection)).toBeNull();
  });

  it("Enter starts a value edit only on a selected leaf, not on a branch", () => {
    expect(resolveShortcut(key({ key: "Enter" }), leafSelected)).toBe("editValueStart");
    expect(resolveShortcut(key({ key: "Enter" }), branchSelected)).toBeNull();
    expect(resolveShortcut(key({ key: "Enter" }), noSelection)).toBeNull();
  });

  it("Delete/Backspace delete only with a selection", () => {
    expect(resolveShortcut(key({ key: "Delete" }), leafSelected)).toBe("delete");
    expect(resolveShortcut(key({ key: "Backspace" }), leafSelected)).toBe("delete");
    expect(resolveShortcut(key({ key: "Delete" }), noSelection)).toBeNull();
  });

  it("arrow keys navigate regardless of selection", () => {
    expect(resolveShortcut(key({ key: "ArrowDown" }), noSelection)).toBe("moveDown");
    expect(resolveShortcut(key({ key: "ArrowUp" }), noSelection)).toBe("moveUp");
    expect(resolveShortcut(key({ key: "ArrowRight" }), noSelection)).toBe("arrowRight");
    expect(resolveShortcut(key({ key: "ArrowLeft" }), noSelection)).toBe("arrowLeft");
  });

  it("Ctrl+D duplicates regardless of selection (handler itself no-ops on the root)", () => {
    expect(resolveShortcut(key({ key: "d", ctrlKey: true }), noSelection)).toBe("duplicate");
  });

  it("Ctrl+Shift+C copies the full path, Ctrl+C copies the node, both need a selection", () => {
    expect(resolveShortcut(key({ key: "c", ctrlKey: true, shiftKey: true }), leafSelected)).toBe("copyPathFull");
    expect(resolveShortcut(key({ key: "c", ctrlKey: true }), leafSelected)).toBe("copyNode");
    expect(resolveShortcut(key({ key: "c", ctrlKey: true }), noSelection)).toBeNull();
  });

  it("Ctrl+V pastes only with a selection", () => {
    expect(resolveShortcut(key({ key: "v", ctrlKey: true }), leafSelected)).toBe("pasteNode");
    expect(resolveShortcut(key({ key: "v", ctrlKey: true }), noSelection)).toBeNull();
  });

  it("Ctrl+Plus adds a sibling, Ctrl+Shift+Plus adds a child", () => {
    expect(resolveShortcut(key({ key: "+", ctrlKey: true }), noSelection)).toBe("addSibling");
    expect(resolveShortcut(key({ key: "+", ctrlKey: true, shiftKey: true }), noSelection)).toBe("addChild");
  });

  it("numpad Add is shift-independent regardless of the generated key character", () => {
    expect(resolveShortcut(key({ key: "+", ctrlKey: true, code: "NumpadAdd" }), noSelection)).toBe("addSibling");
    expect(resolveShortcut(key({ key: "+", ctrlKey: true, code: "NumpadAdd", shiftKey: true }), noSelection)).toBe(
      "addChild",
    );
  });

  it("QWERTZ Shift+Plus produces '*' but still resolves via shiftKey, not the character", () => {
    expect(resolveShortcut(key({ key: "*", ctrlKey: true, shiftKey: true }), noSelection)).toBe("addChild");
  });

  it("returns null for an unrelated key", () => {
    expect(resolveShortcut(key({ key: "a" }), leafSelected)).toBeNull();
  });
});
