/**
 * Small localStorage-backed preferences that are NOT part of the settings dialog:
 * the directory the file-open dialog should start in (last used one) and the
 * "Zuletzt geöffnet" list on the welcome screen.
 */

const LAST_DIR_KEY = "jaxel.lastDir";
const RECENT_KEY = "jaxel.recentFiles";
const RECENT_MAX = 8;

export function getLastDir(): string | null {
  return localStorage.getItem(LAST_DIR_KEY);
}

/** Derives the containing directory from `filePath` and remembers it for the next open dialog. */
export function rememberLastDir(filePath: string): void {
  const separator = filePath.includes("\\") ? "\\" : "/";
  const index = filePath.lastIndexOf(separator);
  if (index > 0) localStorage.setItem(LAST_DIR_KEY, filePath.slice(0, index));
}

export function getRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentFile(filePath: string): string[] {
  const next = [filePath, ...getRecentFiles().filter((p) => p !== filePath)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
