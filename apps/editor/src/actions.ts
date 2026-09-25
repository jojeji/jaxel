import type { TreeActionKind } from "@jaxel/core";

/**
 * App-Aktionen (CONTEXT.md): everything the user can trigger from more than one place —
 * keyboard, menu bar, context menu, toolbar. Not to be confused with a `Command` (one undoable
 * mutation on the CommandBus). One entry per action: its label, the shortcut shown next to it,
 * and when it is enabled. Every entry point reads from here, so a label, a shortcut hint or an enabled rule
 * cannot differ between, say, the menu bar and the context menu (docs/entscheidungen.md
 * 2026-09-25). What an action actually does stays with App.tsx (`runAction`), which owns the
 * React state it writes.
 *
 * Actions with only one entry point (open log, about, the arrow keys, F2) are not listed:
 * there is nothing that could drift.
 */
export type AppActionId =
  | "newDocument"
  | "openFile"
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "addChild"
  | "addSibling"
  | "duplicate"
  | "delete"
  | "copyPathFull"
  | "copyPath"
  | "copyPathStatic"
  | "copyNode"
  | "pasteNode"
  | "expandAll"
  | "collapseAll"
  | "search"
  | "toggleAttributesPanel"
  | "settings";

/** What the enabled rules may look at — plain values, so the table is testable in Node. */
export interface ActionContext {
  hasDocument: boolean;
  /** Running as a VS Code editor: VS Code owns opening, creating and "save as". */
  embedded: boolean;
  selectionCount: number;
  canUndo: boolean;
  canRedo: boolean;
  /** Whether @jaxel/core's tree-actions blocks this Baumaktion on the current selection. */
  treeActionBlocked: (kind: TreeActionKind) => boolean;
}

/** The locale-dependent key names a shortcut hint is built from. */
export interface KeyNames {
  ctrl: string;
  delete: string;
}

export interface ActionSpec {
  /** i18n key of the label. */
  labelKey: string;
  shortcut?: (keys: KeyNames) => string;
  enabled: (context: ActionContext) => boolean;
}

const always = (): boolean => true;
const withDocument = (context: ActionContext): boolean => context.hasDocument;
/** Path copies describe one node; with several selected there is no single path. */
const oneSelected = (context: ActionContext): boolean => context.selectionCount === 1;

export const ACTIONS: Record<AppActionId, ActionSpec> = {
  newDocument: { labelKey: "welcome.newDocument", shortcut: (k) => `${k.ctrl}+N`, enabled: (c) => !c.embedded },
  openFile: { labelKey: "welcome.openFile", shortcut: (k) => `${k.ctrl}+O`, enabled: (c) => !c.embedded },
  save: { labelKey: "welcome.save", shortcut: (k) => `${k.ctrl}+S`, enabled: withDocument },
  saveAs: {
    labelKey: "menuBar.saveAs",
    shortcut: (k) => `${k.ctrl}+Shift+S`,
    enabled: (c) => c.hasDocument && !c.embedded,
  },
  undo: { labelKey: "menuBar.undo", shortcut: (k) => `${k.ctrl}+Z`, enabled: (c) => c.canUndo },
  redo: { labelKey: "menuBar.redo", shortcut: (k) => `${k.ctrl}+Y`, enabled: (c) => c.canRedo },
  addChild: {
    labelKey: "toolbar.addChild",
    shortcut: (k) => `${k.ctrl}+Shift++`,
    enabled: (c) => c.hasDocument && !c.treeActionBlocked("add-child"),
  },
  addSibling: {
    labelKey: "shortcut.addSibling",
    shortcut: (k) => `${k.ctrl}++`,
    enabled: (c) => c.hasDocument && !c.treeActionBlocked("add-sibling"),
  },
  duplicate: {
    labelKey: "toolbar.duplicate",
    shortcut: (k) => `${k.ctrl}+D`,
    enabled: (c) => c.hasDocument && !c.treeActionBlocked("duplicate"),
  },
  delete: {
    labelKey: "toolbar.delete",
    shortcut: (k) => k.delete,
    enabled: (c) => c.hasDocument && !c.treeActionBlocked("delete"),
  },
  copyPathFull: { labelKey: "toolbar.copyPathFull", shortcut: (k) => `${k.ctrl}+Shift+C`, enabled: oneSelected },
  copyPath: { labelKey: "toolbar.copyPath", enabled: oneSelected },
  copyPathStatic: { labelKey: "toolbar.copyPathStatic", enabled: oneSelected },
  // Copies every selected subtree, one fragment each — works with a multi-selection.
  copyNode: { labelKey: "menu.copyNode", shortcut: (k) => `${k.ctrl}+C`, enabled: (c) => c.selectionCount > 0 },
  pasteNode: {
    labelKey: "menu.pasteNode",
    shortcut: (k) => `${k.ctrl}+V`,
    enabled: (c) => c.hasDocument && !c.treeActionBlocked("paste"),
  },
  expandAll: { labelKey: "menuBar.expandAll", shortcut: () => "NumPad *", enabled: withDocument },
  collapseAll: { labelKey: "menuBar.collapseAll", shortcut: () => "NumPad /", enabled: withDocument },
  search: { labelKey: "toolbar.search", shortcut: (k) => `${k.ctrl}+F`, enabled: withDocument },
  toggleAttributesPanel: {
    labelKey: "settings.showAttributesPanel",
    shortcut: (k) => `${k.ctrl}+Alt+A`,
    enabled: always,
  },
  settings: { labelKey: "toolbar.settings", enabled: always },
};

export function isActionEnabled(id: AppActionId, context: ActionContext): boolean {
  return ACTIONS[id].enabled(context);
}
