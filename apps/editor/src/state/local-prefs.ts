/**
 * Small localStorage-backed preferences outside the main settings object: the directory the
 * file-open dialog should start in (last used one) and the "Zuletzt geöffnet" list. The list's
 * limit is configured through Settings, while its entries remain independently stored here.
 */

const LAST_DIR_KEY = "jaxel.lastDir";
const RECENT_KEY = "jaxel.recentFiles";
export const RECENT_FILES_LIMIT_DEFAULT = 8;
export const RECENT_FILES_LIMIT_MAX = 50;

export function normalizeRecentFilesLimit(value: number): number {
  if (!Number.isFinite(value)) return RECENT_FILES_LIMIT_DEFAULT;
  return Math.min(RECENT_FILES_LIMIT_MAX, Math.max(0, Math.round(value)));
}

export function getLastDir(): string | null {
  return localStorage.getItem(LAST_DIR_KEY);
}

/** Derives the containing directory from `filePath` and remembers it for the next open dialog. */
export function rememberLastDir(filePath: string): void {
  const separator = filePath.includes("\\") ? "\\" : "/";
  const index = filePath.lastIndexOf(separator);
  if (index > 0) localStorage.setItem(LAST_DIR_KEY, filePath.slice(0, index));
}

export function getRecentFiles(limit = RECENT_FILES_LIMIT_DEFAULT): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string").slice(0, normalizeRecentFilesLimit(limit))
      : [];
  } catch {
    return [];
  }
}

export function addRecentFile(filePath: string, limit = RECENT_FILES_LIMIT_DEFAULT): string[] {
  const normalizedLimit = normalizeRecentFilesLimit(limit);
  if (normalizedLimit === 0) {
    localStorage.removeItem(RECENT_KEY);
    return [];
  }
  const next = [filePath, ...getRecentFiles(normalizedLimit).filter((p) => p !== filePath)].slice(0, normalizedLimit);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

/** Applies a new history limit immediately; limit 0 deliberately clears the history. */
export function trimRecentFiles(limit: number): void {
  const normalizedLimit = normalizeRecentFilesLimit(limit);
  if (normalizedLimit === 0) {
    localStorage.removeItem(RECENT_KEY);
    return;
  }
  const current = getRecentFiles(normalizedLimit);
  localStorage.setItem(RECENT_KEY, JSON.stringify(current));
}

const SESSION_KEY = "jaxel.session";

/** The tabs of the last session (AP12): full-view tabs on real files only — untitled
 * documents and focus tabs are deliberately not restored (focus node ids do not survive a
 * re-parse). */
export interface StoredSession {
  paths: string[];
  activePath: string | null;
}

export function getStoredSession(): StoredSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { paths: [], activePath: null };
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return {
      paths: Array.isArray(parsed.paths) ? parsed.paths.filter((p): p is string => typeof p === "string") : [],
      activePath: typeof parsed.activePath === "string" ? parsed.activePath : null,
    };
  } catch {
    return { paths: [], activePath: null };
  }
}

export function storeSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Where the search panel docks: bottom bar (default) or as a tab in the right sidebar. */
export type SearchDockSide = "bottom" | "right";

const SEARCH_DOCK_SIDE_KEY = "jaxel.search.dockSide";
const SEARCH_PANEL_HEIGHT_KEY = "jaxel.search.panelHeight";
const SEARCH_SIDEBAR_WIDTH_KEY = "jaxel.search.sidebarWidth";

export const SEARCH_PANEL_HEIGHT_DEFAULT = 260;
export const SEARCH_SIDEBAR_WIDTH_DEFAULT = 320;

export function getSearchDockSide(): SearchDockSide {
  return localStorage.getItem(SEARCH_DOCK_SIDE_KEY) === "right" ? "right" : "bottom";
}

export function setSearchDockSide(side: SearchDockSide): void {
  localStorage.setItem(SEARCH_DOCK_SIDE_KEY, side);
}

/** Height (px) of the bottom-docked search panel, user-resizable via drag handle. */
export function getSearchPanelHeight(): number {
  const raw = Number(localStorage.getItem(SEARCH_PANEL_HEIGHT_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : SEARCH_PANEL_HEIGHT_DEFAULT;
}

export function setSearchPanelHeight(height: number): void {
  localStorage.setItem(SEARCH_PANEL_HEIGHT_KEY, String(Math.round(height)));
}

/** Width (px) of the right-docked search/attributes sidebar, user-resizable via drag handle. */
export function getSearchSidebarWidth(): number {
  const raw = Number(localStorage.getItem(SEARCH_SIDEBAR_WIDTH_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : SEARCH_SIDEBAR_WIDTH_DEFAULT;
}

export function setSearchSidebarWidth(width: number): void {
  localStorage.setItem(SEARCH_SIDEBAR_WIDTH_KEY, String(Math.round(width)));
}
