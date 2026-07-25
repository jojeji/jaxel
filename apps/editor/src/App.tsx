import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  cloneSubtree,
  computeChanges,
  computePaths,
  createInsertNodeCommand,
  createMoveNodeCommand,
  createNode,
  createRemoveNodeCommand,
  createRenameAttributeCommand,
  createRenameCommand,
  createReplaceAllCommand,
  createSetAttributeCommand,
  createSetValueCommand,
  decodeBase64,
  findAll,
  findAncestorChain,
  findNodeById,
  findSiblingSlot,
  getPathSegments,
  parseDocument,
  pathSegmentsOf,
  planInsertRelativeToRow,
  planMove,
  serializeDocument,
  type DocFormat,
  type DocNode,
  type PathSegment,
  type SearchMatch,
  type SearchOptions,
} from "@jaxel/core";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  FilePlus,
  FloppyDisk,
  FolderOpen,
  Gear,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useI18n } from "./i18n/index.js";
import { installGlobalErrorLogging, logError } from "./logging.js";
import { toErrorMessage } from "./errors.js";
import { resolveShortcut } from "./shortcuts.js";
import { tabKey, useJaxelDocuments, type OpenDocumentState } from "./state/document-store.js";
import { useSettings } from "./state/settings-store.js";
import {
  getLastDir,
  rememberLastDir,
  addRecentFile,
  getRecentFiles,
  getStoredSession,
  storeSession,
  getSearchDockSide,
  setSearchDockSide,
  type SearchDockSide,
} from "./state/local-prefs.js";
import { TreeView, type DropPosition, type EditingField } from "./tree/TreeView.js";
import { FocusBreadcrumb } from "./tree/FocusBreadcrumb.js";
import { flattenTree, type TreeRow } from "./tree/flatten.js";
import { nextSelectedRow, planArrowLeft, planArrowRight, type ArrowIntent } from "./tree/keyboard-nav.js";
import { buildFilterKeepSet, flattenFiltered } from "./tree/filter.js";
import { AttributesPanel } from "./panels/AttributesPanel.js";
import { RightSidebar, type SidebarTab } from "./panels/RightSidebar.js";
import { SearchPanel } from "./search/SearchPanel.js";
import { TabBar } from "./tabs/TabBar.js";
import { SettingsDialog } from "./settings/SettingsDialog.js";
import { WelcomeScreen } from "./welcome/WelcomeScreen.js";
import { NewDocumentDialog } from "./welcome/NewDocumentDialog.js";
import { IconButton } from "./ui/IconButton.js";
import { ContextMenu, type ContextMenuItem } from "./ui/ContextMenu.js";
import { MenuBar, type MenuBarEntry, type MenuBarMenu } from "./ui/MenuBar.js";
import { ReloadDialog } from "./ui/ReloadDialog.js";
import { Toast } from "./ui/Toast.js";
import { CloseConfirmDialog } from "./ui/CloseConfirmDialog.js";
import { Base64PreviewDialog } from "./ui/Base64PreviewDialog.js";
import { AboutDialog } from "./ui/AboutDialog.js";

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

interface ToastEntry {
  id: number;
  kind: "status" | "error";
  message: string;
}

const STATUS_TOAST_DURATION_MS = 4_000;
const ERROR_TOAST_DURATION_MS = 8_000;

export function App(): React.ReactElement {
  const { t } = useI18n();
  const { settings, setSettings } = useSettings();
  const {
    docs,
    tabs,
    activeTab,
    activeDoc,
    openFile,
    saveFile,
    saveFileAs,
    newDocument,
    closeTab,
    activate,
    openFocusTab,
    retargetFocusTab,
    acknowledgeExternalChange,
    reloadFile,
  } = useJaxelDocuments();
  const dirtyPaths = useMemo(
    () => new Set(docs.filter((d) => d.isDirty).map((d) => d.filePath)),
    [docs],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  /** Per-tab memory of the `expanded` set, keyed by tab key — so returning to a tab shows it
   * exactly as it was left, instead of collapsing back to just the root every time. */
  const tabViewStateRef = useRef<Map<string, Set<string>>>(new Map());
  /** Which tab key the CURRENT `expanded` state belongs to — set at the end of the tab-switch
   * effect below, read at its start (before the switch) to know where to save it. */
  const activeTabKeyRef = useRef<string | null>(null);
  const nextToastIdRef = useRef(0);
  const [errorToast, setErrorToast] = useState<ToastEntry | null>(null);
  const [statusToast, setStatusToast] = useState<ToastEntry | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [searchDockSide, setSearchDockSideState] = useState<SearchDockSide>(getSearchDockSide);
  /** Which tab is active in the right-docked sidebar; irrelevant while docked at the bottom. */
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("attributes");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [revealNodeId, setRevealNodeId] = useState<string | null>(null);
  /** null = filter off; otherwise the current search matches the tree is reduced to. */
  const [filterMatches, setFilterMatches] = useState<SearchMatch[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [reloadPrompt, setReloadPrompt] = useState<{ filePath: string } | null>(null);
  /** Pending "ungespeicherte Änderungen" question: a single tab close, or the whole window. */
  const [closePrompt, setClosePrompt] = useState<
    { kind: "tab"; key: string; filePath: string; focusNodeId: string | null } | { kind: "window" } | null
  >(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  /** Decoded Base64 TEXT waiting in the preview dialog (binary opens externally instead). */
  const [base64Preview, setBase64Preview] = useState<{ text: string; format: "xml" | "json" | null } | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const externalCheckIdRef = useRef(0);
  const performReloadRef = useRef<(filePath: string, onlyIfClean?: boolean) => Promise<void>>(() => Promise.resolve());
  const keepMinePendingRef = useRef(false);
  const otherDialogOpen = settingsOpen || newDocOpen || closePrompt !== null || aboutOpen || base64Preview !== null;
  const reloadPromptDoc = reloadPrompt ? (docs.find((doc) => doc.filePath === reloadPrompt.filePath) ?? null) : null;
  const modalDialogOpen = otherDialogOpen || reloadPromptDoc !== null;
  const visibleToasts = [errorToast, statusToast]
    .filter((toast): toast is ToastEntry => toast !== null)
    .sort((a, b) => b.id - a.id);

  function setError(message: string | null): void {
    setErrorToast(message === null ? null : { id: ++nextToastIdRef.current, kind: "error", message });
  }

  function setStatus(message: string | null): void {
    setStatusToast(message === null ? null : { id: ++nextToastIdRef.current, kind: "status", message });
  }

  // App version for the "Über"/About dialog — read from Tauri (mirrors package.json /
  // tauri.conf.json); unavailable outside a real Tauri window (e.g. plain `vite` dev/tests).
  useEffect(() => {
    void (async () => {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        setAppVersion(await getVersion());
      } catch {
        setAppVersion(null);
      }
    })();
  }, []);

  // Globale Absturzspuren (AP15 Story 2, 3): window.onerror/unhandledrejection landen im Log.
  useEffect(() => installGlobalErrorLogging(), []);

  // Jede Fehlermeldung, die als Toast erscheint, wird auch geloggt (AP15 Story 5) —
  // eine einzige Stelle statt aller bestehenden setError-Aufrufe.
  useEffect(() => {
    if (errorToast) logError("banner", errorToast.message);
  }, [errorToast]);

  const trueRoot = activeDoc?.document.root ?? null;
  const revision = activeDoc?.document.revision ?? 0;

  /**
   * When the active tab is a "focused view ab Knoten X" (docs/entscheidungen.md 2026-07-18
   * #1), `focus.node` becomes the tab's visible root and `focus.ancestors` is its TRUE
   * ancestor chain (root-first) — used for the breadcrumb and to prefix `row.ancestors` below
   * so mutation Commands still invalidate byteRange all the way to the real document root.
   */
  const focus = useMemo(() => {
    if (!trueRoot || !activeTab?.focusNodeId) return null;
    const node = findNodeById(trueRoot, activeTab.focusNodeId);
    if (!node) return null;
    return { node, ancestors: findAncestorChain(trueRoot, node) ?? [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates after mutations
  }, [trueRoot, activeTab?.focusNodeId, revision]);

  /** The tab's own visible root — the real document root, or the focused node's subtree. */
  const root = focus ? focus.node : trueRoot;

  // If the focused node was deleted (from this tab or another one on the same document),
  // auto-refocus one level up using the ancestor chain captured when focus was last set —
  // repeats until an ancestor that still exists is found (the real root always does).
  useEffect(() => {
    if (!activeTab?.focusNodeId || !trueRoot || focus) return;
    const chain = activeTab.focusAncestorIds;
    for (let i = chain.length - 1; i >= 0; i--) {
      const id = chain[i]!;
      const node = findNodeById(trueRoot, id);
      if (node) {
        const isTrueRoot = i === 0;
        retargetFocusTab(activeTab.key, isTrueRoot ? null : id, isTrueRoot ? null : node.name, chain.slice(0, i));
        setStatus(t("focus.autoRefocused"));
        return;
      }
    }
  }, [activeTab, focus, trueRoot, retargetFocusTab, t]);

  // Light is the CSS default (:root); every other theme needs the data attribute.
  useEffect(() => {
    if (settings.theme === "light") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  // Session restore (AP12): reopen the previous session's tabs on startup, unless disabled.
  // Declared BEFORE the session-save effect below so the stored session is read before any
  // save could overwrite it; saving stays suspended until the restore has finished.
  const sessionRestoredRef = useRef(false);
  useEffect(() => {
    if (!settings.restoreSession) {
      sessionRestoredRef.current = true;
      return;
    }
    const stored = getStoredSession();
    void (async () => {
      for (const path of stored.paths) {
        try {
          // openFile, not openPath: restoring must not reshuffle "Zuletzt geöffnet".
          await openFile(path);
        } catch {
          // file vanished since last session — skip it silently
        }
      }
      if (stored.activePath) activate(stored.activePath);
      sessionRestoredRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, reads initial setting
  }, []);

  // Record the current session (full-view tabs on real files; untitled and focus tabs are
  // deliberately excluded — focus node ids do not survive a re-parse).
  useEffect(() => {
    if (!sessionRestoredRef.current) return;
    const paths = tabs
      .filter((t) => !t.focusNodeId)
      .map((t) => t.filePath)
      .filter((p) => !docs.find((d) => d.filePath === p)?.isUntitled);
    const activePath =
      activeTab && paths.includes(activeTab.filePath) ? activeTab.filePath : null;
    storeSession({ paths, activePath });
  }, [tabs, activeTab, docs]);

  // Files passed on the command line (`jaxel some.xml`) or via "Öffnen mit" arrive here —
  // the backend queues them until the frontend pulls. A second app launch (single-instance)
  // queues its paths too and pings us via event; the running window then opens them as well.
  // openPath (defined below) is reached through a ref so the once-registered listener always
  // sees the current closure.
  const openPathRef = useRef<(path: string) => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    openPathRef.current = openPath;
  });
  useEffect(() => {
    const pullPending = (): void => {
      invoke<string[]>("take_pending_open_paths").then((paths) => {
        for (const path of paths) void openPathRef.current(path);
      });
    };
    pullPending();
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const fn = await listen("jaxel://pending-open-paths", pullPending);
        if (disposed) fn();
        else unlisten = fn;
      } catch {
        // not running inside a Tauri window
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // Intercept the window close while any document has unsaved changes (docs/entscheidungen.md
  // 2026-07-18, Desktop-Reife #1). Registered once; the handler reads the live docs via ref.
  // Unavailable outside a real Tauri window (plain `vite` dev / jsdom) — then nothing to hook.
  const docsRef = useRef(docs);
  const activeFilePathRef = useRef<string | null>(activeDoc?.filePath ?? null);
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    docsRef.current = docs;
    activeFilePathRef.current = activeDoc?.filePath ?? null;
    settingsRef.current = settings;
  }, [activeDoc?.filePath, docs, settings]);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const fn = await getCurrentWindow().onCloseRequested((event) => {
          if (docsRef.current.some((d) => d.isDirty)) {
            event.preventDefault();
            setClosePrompt({ kind: "window" });
          }
        });
        if (disposed) fn();
        else unlisten = fn;
      } catch {
        // not running inside a Tauri window
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // Drag&drop of files onto the window (Tauri webview event; unavailable — and silently
  // skipped — outside a real Tauri window, e.g. in jsdom tests).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const stop = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setDragOver(true);
          } else if (event.payload.type === "leave") {
            setDragOver(false);
          } else if (event.payload.type === "drop") {
            setDragOver(false);
            for (const path of event.payload.paths) void openPath(path);
          }
        });
        if (cancelled) stop();
        else unlisten = stop;
      } catch {
        // not running inside Tauri — drag&drop simply stays unavailable
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openPath only wraps the stable openFile
  }, []);

  // Restore the per-tab EXPANDED set whenever the active TAB changes (not just the document —
  // switching between the full view and a focus tab of the same document is also a distinct
  // view context). A tab seen before comes back exactly as it was left (expanded nodes); a tab
  // seen for the first time starts fresh (just its root expanded). Selection is deliberately
  // NOT restored — always resets, same as before this fix — since the previously selected node
  // may no longer even be visible/relevant in a differently-expanded tree.
  useEffect(() => {
    const previousKey = activeTabKeyRef.current;
    if (previousKey) {
      tabViewStateRef.current.set(previousKey, expanded);
    }
    setSelectedId(null);
    setEditingField(null);
    setFilterMatches(null);
    const newKey = activeTab?.key ?? null;
    const saved = newKey ? tabViewStateRef.current.get(newKey) : undefined;
    if (saved) {
      setExpanded(saved);
    } else {
      const visibleRootId = focus ? focus.node.id : activeDoc?.document.root.id;
      setExpanded(visibleRootId ? new Set([visibleRootId]) : new Set());
    }
    activeTabKeyRef.current = newKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on the tab only
  }, [activeTab?.key]);

  /**
   * The flattened, currently visible row list. Normal mode: expand/collapse driven.
   * Filter mode (search panel): reduced to matches + ancestors (+ subtree per setting),
   * ignoring the expanded set. `revision` invalidates on every mutation (commands
   * mutate the tree in place, `root`'s reference never changes — see TreeView docs). In a
   * focus tab, `root` is the focused node, so `ancestors` is prefixed with the TRUE chain
   * above it (see `focus` above) — mutation Commands need the full chain to invalidate
   * byteRange up to the real document root, not just up to the focus point.
   */
  const rows = useMemo<TreeRow[]>(() => {
    if (!root) return [];
    let base: TreeRow[];
    if (filterMatches) {
      const matchedIds = new Set(filterMatches.map((m) => m.node.id));
      const keep = buildFilterKeepSet(root, matchedIds, settings.filterIncludesSubtree);
      base = flattenFiltered(root, keep);
    } else {
      base = flattenTree(root, expanded);
    }
    if (!focus) return base;
    return base.map((row) => ({ ...row, ancestors: [...focus.ancestors, ...row.ancestors] }));
  }, [root, expanded, revision, filterMatches, settings.filterIncludesSubtree, focus]);

  /** Optional tree change markers/tombstones (Settings: "Baum" toggle, default off) — computed
   * against the TRUE document root (not the possibly-focused `root`), since the baseline was
   * also captured from there; a focus tab's `rows` only shows a subset anyway, so markers/
   * tombstones outside that subtree simply never match a rendered row. */
  const changes = useMemo(() => {
    if (!settings.showTreeChangeMarkers || !trueRoot || !activeDoc) return null;
    return computeChanges(trueRoot, activeDoc.changeBaseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates after mutations
  }, [settings.showTreeChangeMarkers, trueRoot, activeDoc, revision]);

  const selectedRow = useMemo<TreeRow | null>(
    () => rows.find((row) => row.node.id === selectedId) ?? null,
    [rows, selectedId],
  );
  /** Neither a duplicate nor a delete target: the tab's own visible root has no sibling slot. */
  const isRoot = !selectedRow || !findSiblingSlot(selectedRow);
  const canUndo = activeDoc?.commandBus.canUndo() ?? false;
  const canRedo = activeDoc?.commandBus.canRedo() ?? false;

  function toggleRow(row: TreeRow): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row.node.id)) next.delete(row.node.id);
      else next.add(row.node.id);
      return next;
    });
  }

  function selectRow(row: TreeRow): void {
    setSelectedId(row.node.id);
  }

  function expandAncestorsOf(node: DocNode): void {
    if (!root) return;
    const ancestors = findAncestorChain(root, node);
    if (!ancestors) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const ancestor of ancestors) next.add(ancestor.id);
      return next;
    });
  }

  function selectAndReveal(node: DocNode): void {
    expandAncestorsOf(node);
    setSelectedId(node.id);
    setRevealNodeId(node.id);
  }

  function fileNameOf(path: string): string {
    return path.split(/[/\\]/).pop() ?? path;
  }

  /**
   * Re-reads `filePath` from disk (docs/entscheidungen.md 2026-07-18 #4). If it's the active
   * tab's document, the current selection and expanded nodes are captured as path SEGMENTS
   * (not ids — the fresh parse assigns entirely new ids) before reloading, then resolved
   * against the new tree afterwards so the view stays as close as possible to where it was.
   */
  async function performReload(filePath: string, onlyIfClean = false): Promise<void> {
    setReloadPrompt(null);
    const isActiveDoc = activeDoc?.filePath === filePath;
    let selectionSegments: PathSegment[] | null = null;
    const expandedSegmentsList: PathSegment[][] = [];
    if (isActiveDoc && trueRoot) {
      if (selectedRow) {
        selectionSegments = getPathSegments(selectedRow.node, selectedRow.ancestors);
      }
      for (const id of expanded) {
        const node = findNodeById(trueRoot, id);
        if (!node) continue;
        expandedSegmentsList.push(pathSegmentsOf(trueRoot, node));
      }
    }
    const reloadResult = await reloadFile(
      filePath,
      selectionSegments,
      expandedSegmentsList,
      onlyIfClean
        ? () => {
            const currentDoc = docsRef.current.find((doc) => doc.filePath === filePath);
            return activeFilePathRef.current === filePath && currentDoc?.isDirty === false;
          }
        : undefined,
    );
    if (!reloadResult) {
      const currentDoc = docsRef.current.find((doc) => doc.filePath === filePath);
      if (activeFilePathRef.current === filePath && currentDoc?.isDirty) setReloadPrompt({ filePath });
      return;
    }
    const { selectedId: newSelectedId, expandedIds } = reloadResult;
    if (isActiveDoc) {
      setSelectedId(newSelectedId);
      setExpanded(new Set(expandedIds));
    }
    setStatus(t("reload.reloaded").replace("{name}", fileNameOf(filePath)));
  }
  useLayoutEffect(() => {
    performReloadRef.current = performReload;
  });

  async function handleKeepMine(filePath: string): Promise<void> {
    if (keepMinePendingRef.current) return;
    keepMinePendingRef.current = true;
    try {
      const stat = await invoke<{ mtimeMs: number; size: number }>("stat_file", { path: filePath });
      if (docsRef.current.some((doc) => doc.filePath === filePath)) {
        acknowledgeExternalChange(filePath, stat.mtimeMs, stat.size);
      }
    } catch {
      // Keeping the in-memory version remains valid even if the file vanished meanwhile.
    } finally {
      keepMinePendingRef.current = false;
      setReloadPrompt((current) => (current?.filePath === filePath ? null : current));
    }
  }

  // External-change detection (docs/entscheidungen.md 2026-07-18 #4): checked only when the
  // window regains focus (no background file watcher), only for the active tab's document
  // (a background tab is checked lazily once the user switches to it), and via cheap
  // metadata (mtime+size) rather than re-reading the file — see stat_file in src-tauri.
  useEffect(() => {
    function handleFocus(): void {
      if (!activeDoc || activeDoc.isUntitled) return;
      const { filePath } = activeDoc;
      const checkId = ++externalCheckIdRef.current;
      invoke<{ mtimeMs: number; size: number }>("stat_file", { path: filePath })
        .then((stat) => {
          if (checkId !== externalCheckIdRef.current || activeFilePathRef.current !== filePath) return;
          const currentDoc = docsRef.current.find((doc) => doc.filePath === filePath);
          if (!currentDoc || (stat.mtimeMs === currentDoc.lastKnownMtimeMs && stat.size === currentDoc.lastKnownSize)) {
            return;
          }
          if (!currentDoc.isDirty && settingsRef.current.autoReloadOnExternalChange) {
            void performReloadRef.current(filePath, true);
          } else {
            setReloadPrompt({ filePath });
          }
        })
        .catch(() => {
          // File might have been deleted/moved externally — out of scope for this feature,
          // and nagging about it on every focus regain would be worse than staying silent.
        });
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  });

  async function handleOpen(): Promise<void> {
    setError(null);
    try {
      const path = await open({
        multiple: false,
        defaultPath: getLastDir() ?? undefined,
        filters: [{ name: "XML/JSON", extensions: ["xml", "json"] }],
      });
      if (typeof path === "string") {
        await openPath(path);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function openPath(path: string): Promise<void> {
    await openFile(path);
    rememberLastDir(path);
    addRecentFile(path);
  }

  /** Saves one document (not necessarily the active one); an untitled document goes through
   * the OS "save as" dialog first. Returns the document's (possibly new) path, or null if
   * the user cancelled that dialog. */
  async function saveDoc(doc: OpenDocumentState): Promise<string | null> {
    if (doc.isUntitled) {
      const extension = doc.format === "xml" ? "xml" : "json";
      const dir = getLastDir();
      const path = await save({
        defaultPath: dir ? `${dir}/${doc.filePath}.${extension}` : `${doc.filePath}.${extension}`,
        filters: [{ name: "XML/JSON", extensions: ["xml", "json"] }],
      });
      if (typeof path !== "string") return null; // user cancelled the dialog
      await saveFileAs(doc.filePath, path);
      rememberLastDir(path);
      addRecentFile(path);
      return path;
    }
    await saveFile(doc.filePath);
    return doc.filePath;
  }

  async function handleSave(): Promise<void> {
    if (!activeDoc) return;
    setError(null);
    try {
      await saveDoc(activeDoc);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  function handleNew(format: DocFormat): void {
    setNewDocOpen(false);
    newDocument(format);
  }

  function handleCommitEdit(row: TreeRow, field: "name" | "value", newText: string): void {
    if (!activeDoc) return;
    setEditingField(null);
    if (field === "name") {
      if (newText === row.node.name || newText.trim() === "") return;
      activeDoc.commandBus.execute(createRenameCommand(row.node, newText, row.ancestors));
    } else {
      if (newText === (row.node.value ?? "")) return;
      activeDoc.commandBus.execute(createSetValueCommand(row.node, newText, row.node.jsonType, row.ancestors));
    }
  }

  function handleSetAttribute(name: string, value: string | null, coalesceKey?: string): void {
    if (!activeDoc || !selectedRow) return;
    activeDoc.commandBus.execute(
      createSetAttributeCommand(selectedRow.node, name, value, selectedRow.ancestors, coalesceKey),
    );
  }

  function handleRenameAttribute(index: number, newName: string, coalesceKey: string): void {
    if (!activeDoc || !selectedRow) return;
    activeDoc.commandBus.execute(
      createRenameAttributeCommand(selectedRow.node, index, newName, selectedRow.ancestors, coalesceKey),
    );
  }

  /** "Sofort anhängen": the attribute exists from the first typed character on. */
  function handleCreateAttribute(name: string, coalesceKey: string): void {
    handleSetAttribute(name, "", coalesceKey);
  }

  /** Selects and scrolls a just-inserted/moved node into view, expanding `expandParentId`
   * first if the node landed as a new child rather than a sibling — the common tail of every
   * insert/move handler below. */
  function focusInsertedNode(nodeId: string, expandParentId?: string): void {
    if (expandParentId) {
      setExpanded((prev) => new Set(prev).add(expandParentId));
    }
    setSelectedId(nodeId);
    setRevealNodeId(nodeId);
  }

  /** Drag&drop move in the tree; drop-position-to-index arithmetic lives in planMove. */
  function handleMoveNode(source: TreeRow, target: TreeRow, position: DropPosition): void {
    if (!activeDoc) return;
    const plan = planMove(source, target, position);
    if (!plan) return;

    activeDoc.commandBus.execute(
      createMoveNodeCommand(
        plan.sourceParent,
        plan.sourceIndex,
        plan.sourceAncestors,
        plan.targetParent,
        plan.targetIndex,
        plan.targetAncestors,
      ),
    );
    focusInsertedNode(source.node.id, position === "into" ? plan.targetParent.id : undefined);
  }

  /** Strg+Shift+Plus / toolbar: insert a child and jump straight into naming it. */
  function handleAddChild(): void {
    if (!activeDoc || !selectedRow) return;
    const child = createNode({ name: "node" });
    activeDoc.commandBus.execute(
      createInsertNodeCommand(selectedRow.node, selectedRow.node.children.length, child, selectedRow.ancestors),
    );
    focusInsertedNode(child.id, selectedRow.node.id);
    setEditingField({ nodeId: child.id, field: "name" });
  }

  /**
   * Strg+Plus: insert a new sibling right after the selected node (same level) and jump
   * straight into naming it. At the tab's own visible root (true document root, or a focus
   * tab's focus node) there is no sibling level to insert into — falls back to a child,
   * same as Strg+Shift+Plus.
   */
  function handleAddSibling(): void {
    if (!activeDoc || !selectedRow) return;
    const plan = planInsertRelativeToRow(selectedRow);
    if (!plan) return;
    const sibling = createNode({ name: "node" });
    activeDoc.commandBus.execute(createInsertNodeCommand(plan.parent, plan.index, sibling, plan.parentAncestors));
    focusInsertedNode(sibling.id, plan.insertedAsChild ? plan.parent.id : undefined);
    setEditingField({ nodeId: sibling.id, field: "name" });
  }

  function handleUndo(): void {
    activeDoc?.commandBus.undo();
  }

  function handleRedo(): void {
    activeDoc?.commandBus.redo();
  }

  function handleDelete(): void {
    if (!activeDoc || !selectedRow) return;
    const slot = findSiblingSlot(selectedRow);
    if (!slot) return; // can't delete the root
    activeDoc.commandBus.execute(createRemoveNodeCommand(slot.parent, slot.index, slot.parentAncestors));
    setSelectedId(null);
    setEditingField(null);
  }

  /** Strg+D: deep-copy the selected node and insert it as its next sibling. */
  function handleDuplicate(): void {
    if (!activeDoc || !selectedRow) return;
    const slot = findSiblingSlot(selectedRow);
    if (!slot) return; // root can't be duplicated
    const copy = cloneSubtree(selectedRow.node);
    activeDoc.commandBus.execute(createInsertNodeCommand(slot.parent, slot.index + 1, copy, slot.parentAncestors));
    focusInsertedNode(copy.id);
  }

  /** Strg+C: serialize the selected subtree (XML fragment / single-key JSON) to the system clipboard. */
  function handleCopyNode(): void {
    if (!activeDoc || !selectedRow) return;
    const text = serializeDocument({
      format: activeDoc.format,
      root: selectedRow.node,
      indent: activeDoc.document.indent,
    }).trimEnd();
    void navigator.clipboard.writeText(text).then(
      () => setStatus(t("clipboard.nodeCopied")),
      (err) => setError(toErrorMessage(err)),
    );
  }

  /**
   * Strg+V: parse the clipboard as a fragment of the document's own format and insert
   * it as the selection's next sibling (root selected: appended as last child instead,
   * the root can't have siblings). Fresh ids / no byteRanges via cloneSubtree.
   */
  async function handlePasteNode(): Promise<void> {
    if (!activeDoc || !selectedRow || !root) return;
    setError(null);
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setError(t("clipboard.readFailed"));
      return;
    }
    let fragmentRoot: DocNode;
    try {
      fragmentRoot = parseDocument(activeDoc.format, text).root;
    } catch {
      setError(t("clipboard.invalidFragment"));
      return;
    }
    if (fragmentRoot.synthetic) {
      // A bare JSON array/primitive/multi-key object has no name to insert under.
      setError(t("clipboard.invalidFragment"));
      return;
    }
    const plan = planInsertRelativeToRow(selectedRow);
    if (!plan) return;
    const pasted = cloneSubtree(fragmentRoot);
    activeDoc.commandBus.execute(createInsertNodeCommand(plan.parent, plan.index, pasted, plan.parentAncestors));
    focusInsertedNode(pasted.id, plan.insertedAsChild ? plan.parent.id : undefined);
  }

  function moveSelection(delta: number): void {
    const next = nextSelectedRow(rows, selectedRow?.node.id ?? null, delta);
    if (next) {
      setSelectedId(next.node.id);
      setRevealNodeId(next.node.id);
    }
  }

  function applyArrowIntent(intent: ArrowIntent): void {
    if (intent.type === "expand") {
      setExpanded((prev) => new Set(prev).add(intent.nodeId));
    } else if (intent.type === "collapse") {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(intent.nodeId);
        return next;
      });
    } else if (intent.type === "select") {
      setSelectedId(intent.nodeId);
      setRevealNodeId(intent.nodeId);
    }
  }

  function handleArrowRight(): void {
    if (!selectedRow) return;
    applyArrowIntent(planArrowRight(selectedRow, expanded));
  }

  function handleArrowLeft(): void {
    if (!selectedRow) return;
    applyArrowIntent(planArrowLeft(selectedRow, expanded));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const ctrl = event.ctrlKey || event.metaKey;
      if (ctrl && event.key.toLowerCase() === "f") {
        if (modalDialogOpen) {
          event.preventDefault();
          return;
        }
        if (!activeDoc) return;
        event.preventDefault();
        if (searchDockSide === "right") {
          setSidebarTab("search");
        } else {
          setSearchOpen(true);
        }
        setSearchFocusRequest((request) => request + 1);
        return;
      }
      if (isTextInput(event.target)) return; // let native text-field undo/typing behave normally

      if (ctrl && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void handleOpen();
        return;
      }
      if (ctrl && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewDocOpen(true);
        return;
      }
      if (!activeDoc) return;

      const action = resolveShortcut(event, {
        hasSelection: selectedRow !== null,
        selectionHasChildren: selectedRow?.hasChildren ?? false,
      });
      if (!action) return;
      event.preventDefault();
      switch (action) {
        case "save":
          void handleSave();
          break;
        case "undo":
          handleUndo();
          break;
        case "redo":
          handleRedo();
          break;
        case "renameStart":
          if (selectedRow) setEditingField({ nodeId: selectedRow.node.id, field: "name" });
          break;
        case "editValueStart":
          if (selectedRow) setEditingField({ nodeId: selectedRow.node.id, field: "value" });
          break;
        case "delete":
          handleDelete();
          break;
        case "moveDown":
          moveSelection(1);
          break;
        case "moveUp":
          moveSelection(-1);
          break;
        case "arrowRight":
          handleArrowRight();
          break;
        case "arrowLeft":
          handleArrowLeft();
          break;
        case "duplicate":
          handleDuplicate();
          break;
        case "copyPathFull":
          handleCopyPath("full");
          break;
        case "copyNode":
          handleCopyNode();
          break;
        case "pasteNode":
          void handlePasteNode();
          break;
        case "addChild":
          handleAddChild();
          break;
        case "addSibling":
          handleAddSibling();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  /** "Whole document" defaults to the tab's own visible root — in a focus tab that's the
   * focused subtree, not the real document root (see docs/entscheidungen.md 2026-07-18 #1).
   * "Subtree only" follows the CURRENT tree selection live (same rule for search and replace). */
  function resolveSearchRoot(documentRoot: DocNode, subtreeOnly: boolean): DocNode {
    return subtreeOnly && selectedRow ? selectedRow.node : documentRoot;
  }

  function handleSearch(options: SearchOptions, subtreeOnly: boolean): SearchMatch[] {
    if (!activeDoc || !root) return [];
    return findAll(resolveSearchRoot(root, subtreeOnly), options);
  }

  function handleNavigate(match: SearchMatch): void {
    if (!activeDoc) return;
    selectAndReveal(match.node);
  }

  /** Bottom -> right keeps the search session but moves it into the sidebar tab, active
   * immediately. Right -> bottom re-opens the bottom bar (the sidebar falls back to Attribute). */
  function handleToggleSearchDock(): void {
    const next: SearchDockSide = searchDockSide === "bottom" ? "right" : "bottom";
    setSearchDockSide(next);
    setSearchDockSideState(next);
    if (next === "right") {
      setSidebarTab("search");
    } else {
      setSearchOpen(true);
    }
  }

  /** Bottom dock: closing really ends the session (unmounts, clears the tree filter).
   * Right dock: closing just switches the sidebar back to the attributes tab — the search
   * component stays mounted in the background with its query/matches intact. */
  function handleSearchClose(): void {
    if (searchDockSide === "right") {
      setSidebarTab("attributes");
      return;
    }
    setFilterMatches(null);
    setSearchOpen(false);
  }

  /** Renderable path segments (root dropped, like formatIndexedPath) for one search match —
   * SearchPanel formats these itself (namespace stripping, width-adaptive truncation).
   * Defensive: a match can stem from an older document state (stale render right around a
   * tab switch or after structural edits) — never let path resolution crash the whole app
   * over a result-list label. */
  function getMatchSegments(match: SearchMatch): PathSegment[] {
    if (!root) return [];
    const ancestors = findAncestorChain(root, match.node);
    if (ancestors === null) return [];
    const segments = getPathSegments(match.node, ancestors);
    return segments.length > 1 ? segments.slice(1) : segments;
  }

  /**
   * Ancestor chains (for byteRange invalidation) always trace from the real trueRoot — only
   * the search/replace scope itself narrows to the selected subtree (or the tab's own
   * visible root, e.g. the focused subtree — see docs/entscheidungen.md 2026-07-18 #1).
   * The undoable-command choreography lives in packages/core (createReplaceAllCommand).
   */
  function handleReplaceAllInternal(options: SearchOptions, replacement: string, subtreeOnly: boolean): number {
    if (!activeDoc || !trueRoot || !root) return 0;
    const searchRoot = resolveSearchRoot(root, subtreeOnly);
    const { command, replacementCount } = createReplaceAllCommand(trueRoot, searchRoot, options, replacement);
    if (command) {
      activeDoc.commandBus.execute(command);
    }
    return replacementCount;
  }

  function copyPath(node: DocNode, kind: "indexed" | "static" | "full"): void {
    if (!activeDoc || !root) return;
    const paths = computePaths(root, node);
    void navigator.clipboard.writeText(paths[kind]).then(
      () => setStatus(t("toolbar.pathCopied")),
      (err) => setError(toErrorMessage(err)),
    );
  }

  function handleCopyPath(kind: "indexed" | "static" | "full"): void {
    if (!selectedRow) return;
    copyPath(selectedRow.node, kind);
  }

  /** Closes a tab and forgets its remembered expand/selection state (see tabViewStateRef above) —
   * otherwise the map would grow forever across a long session of opening/closing tabs. */
  function closeTabAndForgetView(key: string): void {
    tabViewStateRef.current.delete(key);
    closeTab(key);
  }

  function handleCloseTab(key: string): void {
    // Warn only when this close would UNLOAD a dirty document — i.e. no other tab (full
    // view or focus) still references it. Closing a focus tab beside an open full view
    // loses nothing and stays silent.
    const tab = tabs.find((t) => t.key === key);
    if (tab && !tabs.some((t) => t.filePath === tab.filePath && t.key !== key)) {
      const doc = docs.find((d) => d.filePath === tab.filePath);
      if (doc?.isDirty) {
        setClosePrompt({ kind: "tab", key, filePath: tab.filePath, focusNodeId: tab.focusNodeId });
        return;
      }
    }
    closeTabAndForgetView(key);
  }

  async function destroyWindow(): Promise<void> {
    try {
      // destroy(), not close(): close() would re-fire onCloseRequested and re-open the dialog.
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  /** "Speichern"/"Alle speichern" in the close dialog: save first, then finish the close.
   * A cancelled "save as" (untitled document) aborts the whole close — nothing is lost. */
  async function handleClosePromptSave(): Promise<void> {
    const prompt = closePrompt;
    if (!prompt) return;
    setError(null);
    try {
      if (prompt.kind === "tab") {
        const doc = docs.find((d) => d.filePath === prompt.filePath);
        const savedPath = doc ? await saveDoc(doc) : prompt.filePath;
        if (savedPath === null) return; // save-as cancelled — keep the tab open
        setClosePrompt(null);
        // A save-as may have renamed the document (and with it every tab key) — re-derive
        // the closing tab's key from the path the save actually ended up under.
        closeTabAndForgetView(tabKey(savedPath, prompt.focusNodeId));
      } else {
        for (const doc of docs.filter((d) => d.isDirty)) {
          if ((await saveDoc(doc)) === null) return; // cancelled — abort the window close
        }
        setClosePrompt(null);
        await destroyWindow();
      }
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  function handleClosePromptDiscard(): void {
    const prompt = closePrompt;
    if (!prompt) return;
    setClosePrompt(null);
    if (prompt.kind === "tab") closeTabAndForgetView(prompt.key);
    else void destroyWindow();
  }

  /** Base64-Decode-Ansicht (docs/entscheidungen.md 2026-07-18): text goes to the in-app
   * preview dialog, binary content (PDF, images, …) is written to a temp file and handed to
   * the OS default application by the open_decoded_file command. Read-only by design. */
  function handleDecodeBase64(value: string): void {
    setError(null);
    const decoded = decodeBase64(value);
    if (!decoded) {
      setError(t("base64.invalid"));
      return;
    }
    if (decoded.kind === "text") {
      setBase64Preview({ text: decoded.text!, format: decoded.textFormat });
      return;
    }
    invoke<string>("open_decoded_file", { dataBase64: value, extension: decoded.extension }).then(
      (path) => setStatus(t("base64.openedExternally").replace("{path}", path)),
      (err) => setError(toErrorMessage(err)),
    );
  }

  /** "Als neuen Tab öffnen" in the Base64 preview: the decoded text becomes a fresh untitled
   * document — deliberately detached from its source node (read-only view, no write-back). */
  function handleOpenDecodedAsTab(): void {
    if (!base64Preview?.format) return;
    try {
      newDocument(base64Preview.format, base64Preview.text);
      setBase64Preview(null);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  /** Right-click "Fokus ab hier öffnen": a new tab showing only this node's subtree, sharing
   * this document's CommandBus/undo/save (docs/entscheidungen.md 2026-07-18 #1). */
  function handleOpenFocus(): void {
    if (!activeDoc || !selectedRow) return;
    const ancestorIds = selectedRow.ancestors.map((a) => a.id);
    openFocusTab(activeDoc.filePath, selectedRow.node.id, selectedRow.node.name, ancestorIds);
  }

  /** Breadcrumb click: `index` into `focus.ancestors` (0 = the real root, i.e. leave focus). */
  function handleBreadcrumbNavigate(index: number): void {
    if (!activeTab || !focus) return;
    if (index === 0) {
      retargetFocusTab(activeTab.key, null, null, []);
      return;
    }
    const node = focus.ancestors[index]!;
    const ancestorIds = focus.ancestors.slice(0, index).map((a) => a.id);
    retargetFocusTab(activeTab.key, node.id, node.name, ancestorIds);
  }

  /** "Logdatei öffnen": im Über-Dialog UND im Extras-Menü — eine Stelle für Aufruf + Toast. */
  function handleOpenLog(): void {
    invoke<string>("open_log").then(
      (path) => setStatus(t("about.logOpened").replace("{path}", path)),
      (err) => setError(toErrorMessage(err)),
    );
  }

  function buildContextMenuItems(): ContextMenuItem[] {
    const ctrl = t("key.ctrl");
    const isVisibleRoot = !selectedRow || (root !== null && selectedRow.node === root);
    return [
      {
        label: t("toolbar.copyPathFull"),
        shortcut: `${ctrl}+Shift+C`,
        onClick: () => handleCopyPath("full"),
      },
      { label: t("toolbar.copyPath"), onClick: () => handleCopyPath("indexed") },
      { label: t("toolbar.copyPathStatic"), onClick: () => handleCopyPath("static") },
      "separator",
      { label: t("focus.openHere"), disabled: isVisibleRoot, onClick: handleOpenFocus },
      {
        // Manual fallback for values the badge heuristic does not catch (short payloads etc.).
        label: t("base64.decode"),
        disabled: !selectedRow?.node.value,
        onClick: () => {
          if (selectedRow?.node.value) handleDecodeBase64(selectedRow.node.value);
        },
      },
      "separator",
      { label: t("toolbar.addChild"), shortcut: `${ctrl}+Shift++`, onClick: handleAddChild },
      { label: t("toolbar.duplicate"), shortcut: `${ctrl}+D`, disabled: isRoot, onClick: handleDuplicate },
      "separator",
      { label: t("menu.copyNode"), shortcut: `${ctrl}+C`, onClick: handleCopyNode },
      { label: t("menu.pasteNode"), shortcut: `${ctrl}+V`, onClick: () => void handlePasteNode() },
      "separator",
      { label: t("toolbar.delete"), shortcut: t("key.delete"), disabled: isRoot, onClick: handleDelete },
    ];
  }

  /** Klassische Menüleiste (Vorschlag B der UI-Skizze): dieselben Aktionen wie die kompakte
   * Toolbar und das Kontextmenü, nur über einen anderen Einstiegspunkt — keine eigene Logik. */
  function buildMenuBarMenus(): MenuBarMenu[] {
    const ctrl = t("key.ctrl");
    const recentFiles = getRecentFiles();
    const recentEntries: MenuBarEntry[] =
      recentFiles.length > 0
        ? [
            "separator",
            { heading: t("welcome.recent") },
            ...recentFiles.map((path) => ({ label: fileNameOf(path), onClick: () => void openPath(path) })),
          ]
        : [];
    return [
      {
        label: t("menuBar.file"),
        items: [
          { label: t("welcome.newDocument"), shortcut: `${ctrl}+N`, onClick: () => setNewDocOpen(true) },
          { label: t("welcome.openFile"), shortcut: `${ctrl}+O`, onClick: () => void handleOpen() },
          ...recentEntries,
          "separator",
          { label: t("welcome.save"), shortcut: `${ctrl}+S`, disabled: !activeDoc, onClick: () => void handleSave() },
        ],
      },
      {
        label: t("menuBar.edit"),
        items: [
          { label: t("menuBar.undo"), shortcut: `${ctrl}+Z`, disabled: !canUndo, onClick: handleUndo },
          { label: t("menuBar.redo"), shortcut: `${ctrl}+Y`, disabled: !canRedo, onClick: handleRedo },
          "separator",
          {
            label: t("toolbar.addChild"),
            shortcut: `${ctrl}+Shift++`,
            disabled: !selectedRow,
            onClick: handleAddChild,
          },
          {
            label: t("shortcut.addSibling"),
            shortcut: `${ctrl}++`,
            disabled: !selectedRow,
            onClick: handleAddSibling,
          },
          { label: t("toolbar.duplicate"), shortcut: `${ctrl}+D`, disabled: isRoot, onClick: handleDuplicate },
          { label: t("toolbar.delete"), shortcut: t("key.delete"), disabled: isRoot, onClick: handleDelete },
          "separator",
          {
            label: t("toolbar.copyPathFull"),
            shortcut: `${ctrl}+Shift+C`,
            disabled: !selectedRow,
            onClick: () => handleCopyPath("full"),
          },
          { label: t("toolbar.copyPath"), disabled: !selectedRow, onClick: () => handleCopyPath("indexed") },
          {
            label: t("toolbar.copyPathStatic"),
            disabled: !selectedRow,
            onClick: () => handleCopyPath("static"),
          },
          "separator",
          { label: t("menu.copyNode"), shortcut: `${ctrl}+C`, disabled: !selectedRow, onClick: handleCopyNode },
          {
            label: t("menu.pasteNode"),
            shortcut: `${ctrl}+V`,
            disabled: !selectedRow,
            onClick: () => void handlePasteNode(),
          },
        ],
      },
      {
        label: t("menuBar.view"),
        items: [
          {
            label: t("toolbar.search"),
            shortcut: `${ctrl}+F`,
            disabled: !activeDoc,
            onClick: () => setSearchOpen((prevOpen) => !prevOpen),
          },
        ],
      },
      {
        label: t("menuBar.tools"),
        items: [
          { label: t("toolbar.settings"), onClick: () => setSettingsOpen(true) },
          { label: t("about.openLog"), onClick: handleOpenLog },
        ],
      },
      {
        label: t("menuBar.help"),
        items: [{ label: t("toolbar.about"), onClick: () => setAboutOpen(true) }],
      },
    ];
  }

  const attributesPanelEl = (
    <AttributesPanel
      node={selectedRow?.node ?? null}
      onSetAttribute={handleSetAttribute}
      onRenameAttribute={handleRenameAttribute}
      onCreateAttribute={handleCreateAttribute}
      onDecodeBase64={handleDecodeBase64}
    />
  );

  const searchPanelEl = (dock: SearchDockSide) =>
    activeTab && (
      <SearchPanel
        // Remount per TAB (not just per document): search state (matches, query, filter)
        // holds live node references into one view and must never survive a tab switch —
        // stale matches resolved against a different root crashed computePaths (see test).
        // Two tabs on the same document (full view + a focus tab) must each get their own
        // independent search session too, hence keying on the tab, not the file path.
        key={activeTab.key}
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        onReplaceAll={handleReplaceAllInternal}
        onFilterChange={setFilterMatches}
        getMatchSegments={getMatchSegments}
        onCopyPath={copyPath}
        showNamespaces={settings.searchShowNamespaces}
        onClose={handleSearchClose}
        focusRequest={searchFocusRequest}
        hasSelection={selectedRow !== null}
        dockSide={dock}
        onToggleDock={handleToggleSearchDock}
      />
    );

  return (
    <div className="app-shell">
      <header className="app-chrome">
        <MenuBar
          menus={buildMenuBarMenus()}
          brand={<strong>{t("app.title")}</strong>}
          trailing={<span>{activeDoc ? activeDoc.filePath : t("app.tagline")}</span>}
        />
        <div className="app-toolbar">
          <IconButton
            icon={FilePlus}
            label={t("welcome.newDocument")}
            shortcut={`${t("key.ctrl")}+N`}
            onClick={() => setNewDocOpen(true)}
          />
          <IconButton icon={FolderOpen} label={t("welcome.openFile")} shortcut={`${t("key.ctrl")}+O`} onClick={handleOpen} />
          <IconButton
            icon={FloppyDisk}
            label={t("welcome.save")}
            shortcut={`${t("key.ctrl")}+S`}
            disabled={!activeDoc}
            onClick={() => void handleSave()}
          />
          <span className="app-toolbar__sep" />
          <IconButton
            icon={ArrowCounterClockwise}
            label={t("menuBar.undo")}
            shortcut={`${t("key.ctrl")}+Z`}
            disabled={!canUndo}
            onClick={handleUndo}
          />
          <IconButton
            icon={ArrowClockwise}
            label={t("menuBar.redo")}
            shortcut={`${t("key.ctrl")}+Y`}
            disabled={!canRedo}
            onClick={handleRedo}
          />
          <span className="app-toolbar__sep" />
          <IconButton
            icon={MagnifyingGlass}
            label={t("toolbar.search")}
            shortcut={`${t("key.ctrl")}+F`}
            disabled={!activeDoc}
            onClick={() => setSearchOpen((prevOpen) => !prevOpen)}
          />
          <div className="app-toolbar__spacer" />
          <IconButton icon={Gear} label={t("toolbar.settings")} onClick={() => setSettingsOpen(true)} />
        </div>
      </header>
      <TabBar
        tabs={tabs}
        activeKey={activeTab?.key ?? null}
        dirtyPaths={dirtyPaths}
        onActivate={activate}
        onClose={handleCloseTab}
        onNewDocument={() => setNewDocOpen(true)}
      />
      {visibleToasts.length > 0 && (
        <div className="toast-viewport">
          {visibleToasts.map((toast) => (
            <Toast
              key={`${toast.kind}-${toast.id}`}
              id={toast.id}
              kind={toast.kind}
              message={toast.message}
              durationMs={toast.kind === "error" ? ERROR_TOAST_DURATION_MS : STATUS_TOAST_DURATION_MS}
              onClose={() => {
                if (toast.kind === "error") {
                  setErrorToast((current) => (current?.id === toast.id ? null : current));
                } else {
                  setStatusToast((current) => (current?.id === toast.id ? null : current));
                }
              }}
            />
          ))}
        </div>
      )}
      <main className="app-main">
        {activeDoc ? (
          <>
            <div className="tree-pane">
              {focus && (
                <FocusBreadcrumb
                  ancestors={focus.ancestors}
                  focusNode={focus.node}
                  onNavigate={handleBreadcrumbNavigate}
                />
              )}
              <TreeView
                rows={rows}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={toggleRow}
                onSelect={selectRow}
                editingField={editingField}
                onStartEditName={(row) => setEditingField({ nodeId: row.node.id, field: "name" })}
                onStartEditValue={(row) => setEditingField({ nodeId: row.node.id, field: "value" })}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={() => setEditingField(null)}
                onRowContextMenu={(row, x, y) => {
                  setSelectedId(row.node.id);
                  setContextMenu({ x, y });
                }}
                onMoveNode={handleMoveNode}
                onDecodeBase64={(row) => {
                  if (row.node.value) handleDecodeBase64(row.node.value);
                }}
                revealNodeId={revealNodeId}
                changes={changes}
              />
              {changes?.truncated && <div className="tree-changes-hint">{t("tree.changesTruncated")}</div>}
            </div>
            {searchDockSide === "right" ? (
              <RightSidebar
                activeTab={sidebarTab}
                onTabChange={setSidebarTab}
                searchAvailable={activeTab !== null}
                attributes={attributesPanelEl}
                search={searchPanelEl("right")}
              />
            ) : (
              attributesPanelEl
            )}
          </>
        ) : (
          <WelcomeScreen
            onOpen={() => void handleOpen()}
            onOpenPath={(path) => void openPath(path)}
            onNew={() => setNewDocOpen(true)}
          />
        )}
      </main>
      {dragOver && <div className="drop-overlay">{t("welcome.dropNow")}</div>}
      {contextMenu && selectedRow && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {searchDockSide === "bottom" && searchOpen && activeDoc && activeTab && searchPanelEl("bottom")}
      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
      {newDocOpen && <NewDocumentDialog onChoose={handleNew} onClose={() => setNewDocOpen(false)} />}
      {aboutOpen && (
        <AboutDialog version={appVersion} onOpenLog={handleOpenLog} onClose={() => setAboutOpen(false)} />
      )}
      {reloadPrompt && reloadPromptDoc && !otherDialogOpen && (
        <ReloadDialog
          fileName={fileNameOf(reloadPrompt.filePath)}
          isDirty={reloadPromptDoc.isDirty}
          onReload={() => void performReload(reloadPrompt.filePath)}
          onKeepMine={() => void handleKeepMine(reloadPrompt.filePath)}
        />
      )}
      {base64Preview && (
        <Base64PreviewDialog
          text={base64Preview.text}
          format={base64Preview.format}
          onOpenAsTab={handleOpenDecodedAsTab}
          onClose={() => setBase64Preview(null)}
        />
      )}
      {closePrompt && (
        <CloseConfirmDialog
          fileNames={
            closePrompt.kind === "tab"
              ? [fileNameOf(closePrompt.filePath)]
              : docs.filter((d) => d.isDirty).map((d) => fileNameOf(d.filePath))
          }
          onSave={() => void handleClosePromptSave()}
          onDiscard={handleClosePromptDiscard}
          onCancel={() => setClosePrompt(null)}
        />
      )}
    </div>
  );
}
