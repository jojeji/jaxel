import { describe, expect, it } from "vitest";
import de from "./i18n/de.json";
import en from "./i18n/en.json";
import { ACTIONS, isActionEnabled, type ActionContext, type AppActionId } from "./actions.js";

const IDS = Object.keys(ACTIONS) as AppActionId[];
const KEYS = { ctrl: "Strg", delete: "Entf" };

function context(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    hasDocument: true,
    embedded: false,
    selectionCount: 1,
    canUndo: true,
    canRedo: true,
    treeActionBlocked: () => false,
    ...overrides,
  };
}

describe("Aktionstabelle", () => {
  it("hat für jede Aktion eine deutsche und eine englische Beschriftung", () => {
    const catalogs: Record<string, Record<string, string>> = { de, en };
    for (const id of IDS) {
      for (const [locale, catalog] of Object.entries(catalogs)) {
        expect(catalog[ACTIONS[id].labelKey], `${id} (${locale})`).toBeTruthy();
      }
    }
  });

  it("vergibt kein Tastenkürzel doppelt", () => {
    const hints = IDS.flatMap((id) => ACTIONS[id].shortcut?.(KEYS) ?? []);
    expect(new Set(hints).size).toBe(hints.length);
  });

  it("kopiert Knoten auch bei Mehrfachauswahl, Pfade nur bei genau einem Knoten", () => {
    const several = context({ selectionCount: 2 });
    expect(isActionEnabled("copyNode", several)).toBe(true);
    expect(isActionEnabled("copyPathFull", several)).toBe(false);
    expect(isActionEnabled("copyPath", several)).toBe(false);
    expect(isActionEnabled("copyPathStatic", several)).toBe(false);
    expect(isActionEnabled("copyNode", context({ selectionCount: 0 }))).toBe(false);
  });

  it("überlässt Öffnen, Neu und Speichern unter im VS-Code-Modus dem Host", () => {
    const embedded = context({ embedded: true });
    expect(isActionEnabled("newDocument", embedded)).toBe(false);
    expect(isActionEnabled("openFile", embedded)).toBe(false);
    expect(isActionEnabled("saveAs", embedded)).toBe(false);
    expect(isActionEnabled("save", embedded)).toBe(true);
  });

  it("sperrt dokumentbezogene Aktionen ohne offenes Dokument", () => {
    const empty = context({ hasDocument: false, selectionCount: 0, canUndo: false, canRedo: false });
    const documentScoped: AppActionId[] = [
      "save",
      "saveAs",
      "addChild",
      "addSibling",
      "duplicate",
      "delete",
      "pasteNode",
      "expandAll",
      "collapseAll",
      "search",
    ];
    for (const id of documentScoped) expect(isActionEnabled(id, empty), id).toBe(false);
    expect(isActionEnabled("openFile", empty)).toBe(true);
    expect(isActionEnabled("settings", empty)).toBe(true);
  });

  it("fragt für Baumaktionen die Core-Regel", () => {
    const blocked = new Set(["delete", "paste"]);
    const partly = context({ treeActionBlocked: (kind) => blocked.has(kind) });
    expect(isActionEnabled("delete", partly)).toBe(false);
    expect(isActionEnabled("pasteNode", partly)).toBe(false);
    expect(isActionEnabled("duplicate", partly)).toBe(true);
    expect(isActionEnabled("addChild", partly)).toBe(true);
  });
});
