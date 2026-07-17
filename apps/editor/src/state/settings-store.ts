import { useCallback, useState } from "react";

export type Theme = "dark" | "light";
/** "windows" (separate OS windows per document) is tracked but not yet implemented — see
 * docs/entscheidungen.md #5 and docs/status.md. The setting exists so it isn't forgotten and
 * so the UI can show it as a clearly-labeled "coming later" option instead of hiding it. */
export type WindowMode = "tabs" | "windows";

export interface Settings {
  theme: Theme;
  windowMode: WindowMode;
  /** Filter mode in the search panel: also keep the whole subtree below a match visible. */
  filterIncludesSubtree: boolean;
}

const STORAGE_KEY = "jaxel.settings";
const DEFAULTS: Settings = { theme: "dark", windowMode: "tabs", filterIncludesSubtree: false };

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings(): { settings: Settings; setSettings: (patch: Partial<Settings>) => void } {
  const [settings, setSettingsState] = useState<Settings>(load);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, setSettings };
}
