import { useCallback, useState } from "react";
import { normalizeRecentFilesLimit, trimRecentFiles, RECENT_FILES_LIMIT_DEFAULT } from "./local-prefs.js";

export type Theme = "light" | "dark" | "nordlicht" | "tanne" | "terrakotta" | "kobalt" | "kontrast";
/** "windows" (separate OS windows per document) is tracked but not yet implemented — see
 * docs/entscheidungen.md #5 and docs/status.md. The setting exists so it isn't forgotten and
 * so the UI can show it as a clearly-labeled "coming later" option instead of hiding it. */
export type WindowMode = "tabs" | "windows";

export interface Settings {
  theme: Theme;
  windowMode: WindowMode;
  /** Filter mode in the search panel: also keep the whole subtree below a match visible. */
  filterIncludesSubtree: boolean;
  /** External-change detection (docs/entscheidungen.md 2026-07-18 #4): when a document changed
   * on disk since it was loaded and there are no unsaved local edits, reload automatically
   * instead of asking. Default off (ask every time) — this NEVER applies while local edits
   * are unsaved, regardless of this setting. */
  autoReloadOnExternalChange: boolean;
  /** Reopen the previous session's tabs on startup (AP12). The session itself is always
   * recorded (cheap, local) — this only gates the restore. */
  restoreSession: boolean;
  /** Trefferliste im Suchpanel: zeigt Namespace-Praefixe (vor dem ":") in Pfad- und
   * Namensspalten an. Default aus (Praefixe ausgeblendet) — betrifft nur diese Anzeige,
   * nicht die Suche selbst, nicht Baum/Attribute-Panel. */
  searchShowNamespaces: boolean;
  /** Baum: markiert Knoten, die seit der letzten Speicherung geändert/neu sind, und zeigt
   * gelöschte Knoten als Tombstone-Zeile (siehe CONTEXT.md "Änderungsmarker"/"Tombstone").
   * Default aus — reine Zusatzanzeige, ändert nichts am Modell/Speichern. */
  showTreeChangeMarkers: boolean;
  /** Programmstart: Fenster maximiert öffnen (Taskleiste bleibt sichtbar). Wirkt beim Start der
   * Standalone-App; im VS-Code-Modus ohne Wirkung. */
  startMaximized: boolean;
  editorFontSize: number;
  showAttributesPanel: boolean;
  recentFilesLimit: number;
}

export const EDITOR_FONT_SIZE_MIN = 10;
export const EDITOR_FONT_SIZE_MAX = 20;
export const EDITOR_FONT_SIZE_DEFAULT = 12;

/** Strg+Mausrad: eine Rasterstufe (1 px) pro Rastung, begrenzt auf den Bereich des Reglers. */
export function zoomEditorFontSize(current: number, direction: "in" | "out"): number {
  const next = current + (direction === "in" ? 1 : -1);
  return Math.min(EDITOR_FONT_SIZE_MAX, Math.max(EDITOR_FONT_SIZE_MIN, next));
}

const STORAGE_KEY = "jaxel.settings";
const DEFAULTS: Settings = {
  theme: "light",
  windowMode: "tabs",
  filterIncludesSubtree: false,
  autoReloadOnExternalChange: false,
  restoreSession: true,
  searchShowNamespaces: false,
  showTreeChangeMarkers: false,
  startMaximized: false,
  editorFontSize: EDITOR_FONT_SIZE_DEFAULT,
  showAttributesPanel: true,
  recentFilesLimit: RECENT_FILES_LIMIT_DEFAULT,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const loaded = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
    return { ...loaded, recentFilesLimit: normalizeRecentFilesLimit(loaded.recentFilesLimit) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings(): { settings: Settings; setSettings: (patch: Partial<Settings>) => void } {
  const [settings, setSettingsState] = useState<Settings>(load);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = {
        ...prev,
        ...patch,
        ...(patch.recentFilesLimit === undefined
          ? {}
          : { recentFilesLimit: normalizeRecentFilesLimit(patch.recentFilesLimit) }),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (patch.recentFilesLimit !== undefined) trimRecentFiles(next.recentFilesLimit);
      return next;
    });
  }, []);

  return { settings, setSettings };
}
