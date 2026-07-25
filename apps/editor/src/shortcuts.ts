/** Which action a keyboard shortcut means — App.tsx's `onKeyDown` only wires this up to the
 * actual React state writes; this module owns the "what does Ctrl+D mean" question, headless
 * testable without a mounted component or a real `KeyboardEvent`. Covers every document-scoped
 * shortcut (Ctrl+S through the "+"-family); Ctrl+F/Ctrl+O/Ctrl+N stay in App.tsx's handler since
 * they fire under different preconditions (Ctrl+F deliberately ignores the text-input guard, see
 * docs/entscheidungen.md 2026-07-21 "Strg+F ist ein Fokus-Shortcut"; Ctrl+O/N fire without an
 * active document). */
export type ShortcutAction =
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "renameStart"
  | "editValueStart"
  | "delete"
  | "moveDown"
  | "moveUp"
  | "extendDown"
  | "extendUp"
  | "arrowRight"
  | "arrowLeft"
  | "duplicate"
  | "copyPathFull"
  | "copyNode"
  | "pasteNode"
  | "addChild"
  | "addSibling"
  | null;

export interface ShortcutContext {
  hasSelection: boolean;
  /** Only consulted when `hasSelection` is true (Enter starts a value edit on a leaf). */
  selectionHasChildren: boolean;
}

/** The subset of `KeyboardEvent` this needs — kept minimal so tests don't have to construct a
 * real DOM event. */
export interface ShortcutKeyInfo {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  key: string;
  code: string;
}

export function resolveShortcut(event: ShortcutKeyInfo, context: ShortcutContext): ShortcutAction {
  const ctrl = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (ctrl && key === "s") return event.shiftKey ? "saveAs" : "save";
  if (ctrl && !event.shiftKey && key === "z") return "undo";
  if ((ctrl && event.shiftKey && key === "z") || (ctrl && key === "y")) return "redo";
  if (event.key === "F2" && context.hasSelection) return "renameStart";
  if (event.key === "Enter" && context.hasSelection && !context.selectionHasChildren) return "editValueStart";
  if ((event.key === "Delete" || event.key === "Backspace") && context.hasSelection) return "delete";
  // Shift+Up/Down grows the multi-selection from its anchor; without Shift the selection
  // collapses back to the single node moved to (see tree/selection.ts).
  if (event.key === "ArrowDown") return event.shiftKey ? "extendDown" : "moveDown";
  if (event.key === "ArrowUp") return event.shiftKey ? "extendUp" : "moveUp";
  if (event.key === "ArrowRight") return "arrowRight";
  if (event.key === "ArrowLeft") return "arrowLeft";
  if (ctrl && key === "d") return "duplicate";
  if (ctrl && event.shiftKey && key === "c" && context.hasSelection) return "copyPathFull";
  if (ctrl && !event.shiftKey && key === "c" && context.hasSelection) return "copyNode";
  if (ctrl && key === "v" && context.hasSelection) return "pasteNode";
  if (ctrl && (event.key === "+" || event.key === "*" || event.code === "NumpadAdd")) {
    // "+" auf Nummernblock ist Shift-unabhängig; auf der Hauptreihe erzeugt Shift+Plus je nach
    // Tastaturlayout ein anderes Zeichen (z. B. "*" auf QWERTZ) — deshalb wird über
    // event.shiftKey verzweigt statt über das erzeugte Zeichen.
    return event.shiftKey ? "addChild" : "addSibling";
  }
  return null;
}
