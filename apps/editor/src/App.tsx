import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  computeChanges,
  computePaths,
  createReplaceAllCommand,
  decodeBase64,
  findAll,
  findAncestorChain,
  findNodeById,
  getPathSegments,
  parseFragments,
  pathSegmentsOf,
  planTreeAction,
  serializeFragments,
  topmostRows,
  treeActionBlocker,
  type DocFormat,
  type DocNode,
  type PathSegment,
  type SearchMatch,
  type SearchOptions,
  type TreeAction,
  type TreeActionBlocker,
  type TreeActionKind,
} from "@jaxel/core";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  FilePlus,
  FloppyDisk,
  FolderOpen,
  Gear,
  MagnifyingGlass,
  SidebarSimple,
} from "@phosphor-icons/react";
import { useI18n } from "./i18n/index.js";
import { installGlobalErrorLogging, logError } from "./logging.js";
import { getJaxelHost } from "./host.js";
import { conversionErrorMessage, toErrorMessage } from "./errors.js";
import { resolveShortcut } from "./shortcuts.js";
import { ACTIONS, isActionEnabled, type ActionContext, type AppActionId } from "./actions.js";
import { useJaxelDocuments } from "./state/document-store.js";
import { formatOfExtension, serializeForSave, tabKey, type OpenDocumentState } from "./state/workspace.js";
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
import { walkTree } from "./tree/walk.js";
import { nextSelectedRow, planArrowLeft, planArrowRight, type ArrowIntent } from "./tree/keyboard-nav.js";
import {
  EMPTY_SELECTION,
  extendSelection,
  pruneSelection,
  selectOnly,
  selectRange,
  selectedRowsInOrder,
  selectionForActionOn,
  soleSelectedId,
  toggle,
  type Selection,
  type SelectModifier,
} from "./tree/selection.js";
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
import { ConvertDialog } from "./ui/ConvertDialog.js";
import { Base64PreviewDialog } from "./ui/Base64PreviewDialog.js";
import { AboutDialog } from "./ui/AboutDialog.js";

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/** Baumaktionen that need nothing but the selected rows (no clipboard, drop target or text). */
type SelectionActionKind =
  | "add-child"
  | "add-sibling"
  | "add-comment"
  | "add-comment-child"
  | "delete"
  | "duplicate"
  | "comment-out"
  | "uncomment";

interface ToastEntry {
  id: number;
  kind: "status" | "error";
  message: string;
}

const STATUS_TOAST_DURATION_MS = 4_000;
const ERROR_TOAST_DURATION_MS = 8_000;

export function App(): React.ReactElement {
  const host = getJaxelHost();
  const embedded = host.mode === "vscode";
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
    convertSaveAs,
    newDocument,
    closeTabs,
    planClose,
    reorderTabs,
    activate,
    openFocusTab,
    retargetFocusTab,
    acknowledgeExternalChange,
    acknowledgeSaved,
    reloadFile,
  } = useJaxelDocuments(host);
  const dirtyPaths = useMemo(
    () => new Set(docs.filter((d) => d.isDirty).map((d) => d.filePath)),
    [docs],
  );
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  /** Per-tab memory of the `expanded` set, keyed by the tab's stable `id` (not its key, which
   * "Speichern unter", conversion and reload change) — so returning to a tab shows it exactly as
   * it was left, instead of collapsing back to just the root every time. */
  const tabViewStateRef = useRef<Map<string, Set<string>>>(new Map());
  /** Which tab id the CURRENT `expanded` state belongs to — set at the end of the tab-switch
   * effect below, read at its start (before the switch) to know where to save it. */
  const activeTabIdRef = useRef<string | null>(null);
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
  /** Set while the user is being asked to confirm an XML<->JSON conversion triggered by the
   * extension they picked in "Speichern unter". Nothing is written until they confirm. */
  const [convertPrompt, setConvertPrompt] = useState<{
    filePath: string;
    newPath: string;
    targetFormat: DocFormat;
  } | null>(null);
  /** Pending "ungespeicherte Änderungen" question: closing a set of tabs (one or several), or
   * the whole window. `tabs` names each closing tab by document + focus rather than by key,
   * because saving an untitled document renames its path (and with it every key). */
  const [closePrompt, setClosePrompt] = useState<
    | { kind: "tabs"; tabs: Array<{ filePath: string; focusNodeId: string | null }>; dirtyPaths: string[] }
    | { kind: "window" }
    | null
  >(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  /** Decoded Base64 TEXT waiting in the preview dialog (binary opens externally instead). */
  const [base64Preview, setBase64Preview] = useState<{ text: string; format: "xml" | "json" | null } | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const externalCheckIdRef = useRef(0);
  const performReloadRef = useRef<(filePath: string, onlyIfClean?: boolean) => Promise<void>>(() => Promise.resolve());
  const keepMinePendingRef = useRef(false);
  const reloadPromptDoc = reloadPrompt ? (docs.find((doc) => doc.filePath === reloadPrompt.filePath) ?? null) : null;
  /** The one modal dialog on screen, or null. EVERY dialog state belongs in this list — it is
   * what blocks all App-Aktionen and keyboard shortcuts behind a dialog, and it keeps dialogs
   * from stacking: the reload question comes last because it waits ("vorgemerkt") until no other
   * dialog is open (docs/entscheidungen.md 2026-07-21). */
  const visibleDialog = settingsOpen
    ? "settings"
    : newDocOpen
      ? "newDocument"
      : closePrompt
        ? "close"
        : convertPrompt
          ? "convert"
          : aboutOpen
            ? "about"
            : base64Preview
              ? "base64"
              : reloadPromptDoc
                ? "reload"
                : null;
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
    void host.getVersion().then(setAppVersion);
  }, [host]);

  // VS Code supplies exactly one document to an embedded Jaxel instance. The
  // provider remains responsible for the CustomDocument and disk writes.
  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;
    void host.getInitialDocument().then((initial) => {
      if (!cancelled && initial) void openFile(initial.path);
    });
    return () => { cancelled = true; };
  }, [embedded, host, openFile]);

  useEffect(() => host.onSaved((_revision, text, stat) => {
    if (!activeDoc) return;
    if (text !== undefined) acknowledgeSaved(activeDoc.filePath, text, stat);
    else activeDoc.commandBus.markSaved(); // Compatibility with older embedded bundles.
  }), [host, activeDoc, acknowledgeSaved]);

  useEffect(() => {
    host.notifyDirty(activeDoc?.isDirty ?? false);
  }, [host, activeDoc?.isDirty, activeDoc?.document.revision]);

  useEffect(() => {
    const stopContent = host.onRequestCurrentContent((requestId) => {
      if (activeDoc) host.respondCurrentContent(requestId, serializeForSave(activeDoc), activeDoc.document.revision);
    });
    const stopSession = host.onRequestSession((requestId) => host.respondSession(requestId, null));
    return () => { stopContent(); stopSession(); };
  }, [host, activeDoc]);

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
  const sessionRestoreReadyRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (embedded) {
      sessionRestoredRef.current = true;
      return;
    }
    if (!settings.restoreSession) {
      sessionRestoredRef.current = true;
      return;
    }
    const stored = getStoredSession();
    const restoreSession = async (): Promise<void> => {
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
    };
    sessionRestoreReadyRef.current = restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, reads initial setting
  }, [embedded, openFile, activate]);

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

  useEffect(() => {
    if (!settings.showAttributesPanel && searchDockSide === "right" && activeTab) {
      setSidebarTab("search");
    }
  }, [settings.showAttributesPanel, searchDockSide, activeTab]);

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
    const pullPending = async (): Promise<void> => {
      // A passed-in file must win over the restored active tab. Waiting here also makes the
      // initial command-line paths and paths forwarded by a second instance follow the same
      // ordering. The backend keeps them queued until this pull happens.
      await sessionRestoreReadyRef.current;
      const paths = await host.takePendingOpenPaths();
      for (const path of paths) await openPathRef.current(path);
    };
    void pullPending();
    const stop = host.onPendingOpenPaths(() => void pullPending());
    return () => {
      stop();
    };
  }, [host]);

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
    const stop = host.onCloseRequested((event) => {
      if (docsRef.current.some((d) => d.isDirty)) {
        event.preventDefault();
        setClosePrompt({ kind: "window" });
      }
    });
    return () => {
      stop();
    };
  }, [host]);

  // Drag&drop of files onto the window (Tauri webview event; unavailable — and silently
  // skipped — outside a real Tauri window, e.g. in jsdom tests).
  useEffect(() => {
    const stop = host.onFileDrop((event) => {
          if (event.type === "enter" || event.type === "over") {
            setDragOver(true);
          } else if (event.type === "leave") {
            setDragOver(false);
          } else if (event.type === "drop") {
            setDragOver(false);
            for (const path of event.paths) void openPath(path);
          }
        });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openPath only wraps the stable openFile
  }, [host]);

  // Restore the per-tab EXPANDED set whenever the active TAB changes (not just the document —
  // switching between the full view and a focus tab of the same document is also a distinct
  // view context). A tab seen before comes back exactly as it was left (expanded nodes); a tab
  // seen for the first time starts fresh (just its root expanded). Selection is deliberately
  // NOT restored — always resets, same as before this fix — since the previously selected node
  // may no longer even be visible/relevant in a differently-expanded tree.
  useEffect(() => {
    const previousId = activeTabIdRef.current;
    if (previousId) {
      tabViewStateRef.current.set(previousId, expanded);
    }
    setSelection(EMPTY_SELECTION);
    setEditingField(null);
    setFilterMatches(null);
    const newId = activeTab?.id ?? null;
    const saved = newId ? tabViewStateRef.current.get(newId) : undefined;
    if (saved) {
      setExpanded(saved);
    } else {
      const visibleRootId = focus ? focus.node.id : activeDoc?.document.root.id;
      setExpanded(visibleRootId ? new Set([visibleRootId]) : new Set());
    }
    activeTabIdRef.current = newId;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on the tab only
  }, [activeTab?.id]);

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

  /**
   * The one selected row — null when nothing OR more than one node is selected. Every
   * single-node-only feature (rename, edit value, add child/sibling, attributes panel, focus,
   * breadcrumb, search scope) keeps hanging off this, so multi-selection simply switches those
   * off instead of each of them needing its own multi-selection story.
   */
  const selectedRow = useMemo<TreeRow | null>(() => {
    const soleId = soleSelectedId(selection);
    return soleId === null ? null : (rows.find((row) => row.node.id === soleId) ?? null);
  }, [rows, selection]);
  /** All selected rows in visible order — what the bulk actions (delete, duplicate, copy, drag)
   * operate on. Single selection is just its one-element case. */
  const selectedRows = useMemo<TreeRow[]>(() => selectedRowsInOrder(selection, rows), [selection, rows]);

  // Forget selected nodes that are no longer among the visible rows — collapsed away, filtered
  // out by the search panel, or deleted. Without this a bulk action could still carry ids the
  // user can no longer see. `pruneSelection` returns the same object when nothing changed, so
  // this settles after one pass instead of looping.
  useEffect(() => {
    setSelection((current) => pruneSelection(current, rows));
  }, [rows]);
  /** Why a Baumaktion cannot run on the current selection, or null (@jaxel/core tree-actions —
   * the one place that knows e.g. that an Auskommentierter Teilbaum is read-only). The same
   * answer greys out menu entries and stops the keyboard shortcut. */
  function actionBlocker(kind: TreeActionKind): TreeActionBlocker | "no-document" | null {
    if (!activeDoc) return "no-document";
    return treeActionBlocker(selectedRows, kind, { format: activeDoc.format, indent: activeDoc.document.indent });
  }
  const actionBlocked = (kind: TreeActionKind): boolean => actionBlocker(kind) !== null;
  const canUndo = activeDoc?.commandBus.canUndo() ?? false;
  const canRedo = activeDoc?.commandBus.canRedo() ?? false;
  const actionContext: ActionContext = {
    hasDocument: activeDoc !== null,
    embedded,
    selectionCount: selectedRows.length,
    canUndo,
    canRedo,
    modalOpen: visibleDialog !== null,
    treeActionBlocked: actionBlocked,
  };

  /** Label, shortcut hint and enabled state of an App-Aktion from the one table in actions.ts —
   * the same props for a menu bar entry, a context menu entry and a toolbar button. */
  function actionProps(id: AppActionId): { label: string; shortcut?: string; disabled: boolean; onClick: () => void } {
    const spec = ACTIONS[id];
    return {
      label: t(spec.labelKey),
      shortcut: spec.shortcut?.({ ctrl: t("key.ctrl"), delete: t("key.delete") }),
      disabled: !isActionEnabled(id, actionContext),
      onClick: () => runAction(id),
    };
  }

  function toggleRow(row: TreeRow): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row.node.id)) next.delete(row.node.id);
      else next.add(row.node.id);
      return next;
    });
  }

  /** Opens every container below the current visible root (document root or focus root). */
  function expandAllTree(): void {
    if (!root) return;
    const next = new Set<string>();
    walkTree(root, (node) => {
      if (node.children.length > 0) next.add(node.id);
    });
    setExpanded(next);
  }

  /** Closes every container below the current visible root while keeping that root visible. */
  function collapseAllTree(): void {
    if (!root) return;
    setExpanded(root.children.length > 0 ? new Set([root.id]) : new Set());
  }

  /** Click on a row. Ctrl toggles that one node, Shift spans a range from the anchor, a plain
   * click collapses back to just this node (see tree/selection.ts). */
  function selectRow(row: TreeRow, modifier: SelectModifier = "none"): void {
    setSelection((current) => {
      if (modifier === "toggle") return toggle(current, row.node.id);
      if (modifier === "range") return selectRange(current, rows, row.node.id);
      return selectOnly(row.node.id);
    });
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
    setSelection(selectOnly(node.id));
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
  /** Captures the current selection and expanded nodes as path SEGMENTS — the only form that
   * survives a re-parse, which assigns entirely new node ids. Empty unless `filePath` is the
   * active tab's document (a background document has no visible view to restore). Shared by
   * reload and format conversion, both of which replace the tree wholesale. */
  /** A tab view captured as path SEGMENTS before a reload or conversion, which gives every node
   * a new id: the active tab's selection + expanded nodes, followed by the remembered expanded
   * nodes of the document's other tabs. The Workspace resolves every entry of
   * `expandedSegmentsList` independently and in order, so `applyResolvedViews` can split the
   * result back up. */
  interface CapturedViews {
    selectionSegments: PathSegment[] | null;
    expandedSegmentsList: PathSegment[][];
    activeCount: number;
    others: Array<{ tabId: string; count: number }>;
  }

  function captureViewSegments(filePath: string): CapturedViews {
    let selectionSegments: PathSegment[] | null = null;
    const expandedSegmentsList: PathSegment[][] = [];
    const others: CapturedViews["others"] = [];
    if (activeDoc?.filePath !== filePath || !trueRoot) {
      return { selectionSegments, expandedSegmentsList, activeCount: 0, others };
    }
    const pushSegments = (ids: Iterable<string>): number => {
      let count = 0;
      for (const id of ids) {
        const node = findNodeById(trueRoot, id);
        if (!node) continue;
        expandedSegmentsList.push(pathSegmentsOf(trueRoot, node));
        count++;
      }
      return count;
    };
    if (selectedRow) selectionSegments = getPathSegments(selectedRow.node, selectedRow.ancestors);
    const activeCount = pushSegments(expanded);
    for (const tab of tabs) {
      if (tab.filePath !== filePath || tab.id === activeTab?.id) continue;
      const stored = tabViewStateRef.current.get(tab.id);
      if (stored) others.push({ tabId: tab.id, count: pushSegments(stored) });
    }
    return { selectionSegments, expandedSegmentsList, activeCount, others };
  }

  /** Stores the re-resolved views of the other tabs and returns the active tab's expanded ids. */
  function applyResolvedViews(captured: CapturedViews, expandedIds: string[]): string[] {
    let offset = captured.activeCount;
    for (const other of captured.others) {
      tabViewStateRef.current.set(other.tabId, new Set(expandedIds.slice(offset, offset + other.count)));
      offset += other.count;
    }
    return expandedIds.slice(0, captured.activeCount);
  }

  async function performReload(filePath: string, onlyIfClean = false): Promise<void> {
    setReloadPrompt(null);
    const isActiveDoc = activeDoc?.filePath === filePath;
    const captured = captureViewSegments(filePath);
    const reloadResult = await reloadFile(
      filePath,
      captured.selectionSegments,
      captured.expandedSegmentsList,
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
    const { selectedId: newSelectedId } = reloadResult;
    const expandedIds = applyResolvedViews(captured, reloadResult.expandedIds);
    if (isActiveDoc) {
      // A reload re-parses into all-new node ids, so only the single re-resolved selection
      // survives — a multi-selection is not carried across (see performReload's doc comment).
      setSelection(newSelectedId ? selectOnly(newSelectedId) : EMPTY_SELECTION);
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
      const stat = await host.statFile(filePath);
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
      host.statFile(filePath)
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
    if (embedded) return;
    setError(null);
    try {
      const path = await host.pickOpenFile(getLastDir());
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
    addRecentFile(path, settings.recentFilesLimit);
  }

  /** Always shows the OS "save as" dialog — for an untitled document's first save AND for the
   * explicit "Speichern unter" action on an already-named one. Returns the chosen path, or null
   * if the user cancelled.
   *
   * Picking the OTHER format's extension converts instead of saving (docs/entscheidungen.md,
   * "Grilling: XML/JSON-Konvertierung"). That needs a confirmation first, so this returns null
   * in that case too — the write happens later, from `handleConvertConfirm`. Callers that read
   * the return value (the close-tab flow) therefore treat a pending conversion like a cancel
   * and keep the tab open, which is the safe direction. */
  async function promptSaveAs(doc: OpenDocumentState): Promise<string | null> {
    const extension = doc.format === "xml" ? "xml" : "json";
    const dir = getLastDir();
    const path = await host.pickSaveFile(doc.isUntitled
        ? dir
          ? `${dir}/${doc.filePath}.${extension}`
          : `${doc.filePath}.${extension}`
        : doc.filePath, ["xml", "json"]);
    if (typeof path !== "string") return null; // user cancelled the dialog
    const targetFormat = formatOfExtension(path);
    if (targetFormat && targetFormat !== doc.format) {
      setConvertPrompt({ filePath: doc.filePath, newPath: path, targetFormat });
      return null;
    }
    await saveFileAs(doc.filePath, path);
    rememberLastDir(path);
    addRecentFile(path, settings.recentFilesLimit);
    return path;
  }

  /** Runs the conversion the user just confirmed. Selection and expanded nodes are re-resolved
   * by path, exactly like a reload — the converted tree has all-new node ids. */
  async function handleConvertConfirm(): Promise<void> {
    if (!convertPrompt) return;
    const { filePath, newPath, targetFormat } = convertPrompt;
    setConvertPrompt(null);
    setError(null);
    try {
      const captured = captureViewSegments(filePath);
      const result = await convertSaveAs(
        filePath,
        newPath,
        targetFormat,
        captured.selectionSegments,
        captured.expandedSegmentsList,
      );
      setSelection(result.selectedId ? selectOnly(result.selectedId) : EMPTY_SELECTION);
      setExpanded(new Set(applyResolvedViews(captured, result.expandedIds)));
      setEditingField(null);
      rememberLastDir(newPath);
      addRecentFile(newPath, settings.recentFilesLimit);
      setStatus(
        t("convert.done").replace("{name}", fileNameOf(newPath)).replace("{target}", targetFormat.toUpperCase()),
      );
    } catch (err) {
      setError(conversionErrorMessage(err, t));
    }
  }

  /** Saves one document (not necessarily the active one); an untitled document goes through
   * the OS "save as" dialog first. Returns the document's (possibly new) path, or null if
   * the user cancelled that dialog. */
  async function saveDoc(doc: OpenDocumentState): Promise<string | null> {
    if (doc.isUntitled) return promptSaveAs(doc);
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

  /** "Speichern unter" (Menü/`Strg+Shift+S`) — unlike `handleSave`, always prompts, even for an
   * already-named document. */
  async function handleSaveAs(): Promise<void> {
    if (embedded) return;
    if (!activeDoc) return;
    setError(null);
    try {
      await promptSaveAs(activeDoc);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  function handleNew(format: DocFormat): void {
    setNewDocOpen(false);
    newDocument(format);
  }

  /**
   * Plans a Baumaktion in @jaxel/core, executes it as one undo step and applies the follow-up
   * the plan asks for (select/reveal the new nodes, expand their parent, open the editor).
   * Returns the blocker when the action cannot run, null when it ran.
   */
  function runTreeAction(rows: TreeRow[], action: TreeAction): TreeActionBlocker | "no-document" | null {
    if (!activeDoc) return "no-document";
    const result = planTreeAction(rows, action, { format: activeDoc.format, indent: activeDoc.document.indent });
    if (!result.ok) return result.blocker;
    const { command, select, expand, edit } = result.plan;
    activeDoc.commandBus.execute(command);
    if (expand) setExpanded((prev) => new Set(prev).add(expand));
    if (select === undefined) return null;
    const first = select[0];
    if (first === undefined) {
      setSelection(EMPTY_SELECTION);
      setEditingField(null);
      return null;
    }
    // The whole group stays selected (bulk duplicate/paste/move) for a follow-up action; the
    // first one is scrolled into view.
    setSelection({ ids: new Set(select), anchorId: first, leadId: select[select.length - 1]! });
    setRevealNodeId(first);
    if (edit) setEditingField({ nodeId: first, field: edit });
    return null;
  }

  function handleCommitEdit(row: TreeRow, field: "name" | "value", newText: string): void {
    setEditingField(null);
    const blocker = runTreeAction(
      [row],
      field === "name" ? { kind: "rename", name: newText } : { kind: "set-value", value: newText },
    );
    if (blocker === "contains-double-hyphen") setError(t("comment.doubleHyphenRejected"));
  }

  function handleSetAttribute(name: string, value: string | null, coalesceKey?: string): void {
    if (selectedRow) runTreeAction([selectedRow], { kind: "set-attribute", name, value, coalesceKey });
  }

  function handleRenameAttribute(index: number, newName: string, coalesceKey: string): void {
    if (selectedRow) runTreeAction([selectedRow], { kind: "rename-attribute", index, name: newName, coalesceKey });
  }

  /** "Sofort anhängen": the attribute exists from the first typed character on. */
  function handleCreateAttribute(name: string, coalesceKey: string): void {
    handleSetAttribute(name, "", coalesceKey);
  }

  /**
   * Drag&drop move in the tree. Dragging a row that is part of the current multi-selection
   * moves the WHOLE selection (keeping its visible order); dragging any other row collapses the
   * selection to that one row first — the same rule the context menu uses.
   */
  function handleMoveNode(source: TreeRow, target: TreeRow, position: DropPosition): void {
    const dragged = selectionForActionOn(selection, source.node.id);
    runTreeAction(selectedRowsInOrder(dragged, rows), { kind: "move", target, position });
  }

  function handleUndo(): void {
    activeDoc?.commandBus.undo();
  }

  function handleRedo(): void {
    activeDoc?.commandBus.redo();
  }

  /** Strg+Plus / Strg+Shift+Plus / Entf / Strg+D and the comment actions: selection-scoped
   * Baumaktionen without a payload. */
  function handleSelectionAction(kind: SelectionActionKind): void {
    runTreeAction(selectedRows, { kind });
  }

  /** Strg+C: serialize the selected subtree(s) to the system clipboard — one XML fragment /
   * single-key JSON object for a single node, several fragments for a multi-selection (see
   * serializeFragments). */
  function handleCopyNode(): void {
    if (!activeDoc || selectedRows.length === 0) return;
    const text = serializeFragments(
      activeDoc.format,
      topmostRows(selectedRows).map((row) => row.node),
      activeDoc.document.indent,
    ).trimEnd();
    void navigator.clipboard.writeText(text).then(
      () => setStatus(t("clipboard.nodeCopied")),
      (err) => setError(toErrorMessage(err)),
    );
  }

  /**
   * Strg+V: parse the clipboard as one or several fragments of the document's own format and
   * insert them after the LAST selected row (root selected: appended as last children instead)
   * as ONE undo step. Fresh ids / no byteRanges come from parseFragments.
   */
  async function handlePasteNode(): Promise<void> {
    if (!activeDoc || actionBlocked("paste")) return;
    const format = activeDoc.format;
    setError(null);
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setError(t("clipboard.readFailed"));
      return;
    }
    let fragments: DocNode[];
    try {
      fragments = parseFragments(format, text);
    } catch {
      setError(t("clipboard.invalidFragment"));
      return;
    }
    if (runTreeAction(selectedRows, { kind: "paste", fragments }) === "invalid-fragment") {
      setError(t("clipboard.invalidFragment"));
    }
  }

  /** Arrow up/down WITHOUT Shift: collapses any multi-selection back to the single node one
   * step away, measured from the lead end of the current range. */
  function moveSelection(delta: number): void {
    const next = nextSelectedRow(rows, selection.leadId, delta);
    if (next) {
      setSelection(selectOnly(next.node.id));
      setRevealNodeId(next.node.id);
    }
  }

  /** Shift+arrow up/down: grows or shrinks the range instead of moving it. */
  function extendSelectionBy(delta: number): void {
    const next = extendSelection(selection, rows, delta);
    setSelection(next);
    if (next.leadId) setRevealNodeId(next.leadId);
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
      setSelection(selectOnly(intent.nodeId));
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

  /** Toolbar/menu "Suchen": shows or hides the search in whichever dock it lives. (Strg+F is
   * different on purpose: it always opens and focuses, see the keyboard handler.) */
  function toggleSearch(): void {
    if (searchDockSide === "right") {
      if (sidebarTab === "search") {
        handleSearchClose();
      } else {
        setSidebarTab("search");
        setSearchFocusRequest((request) => request + 1);
      }
      return;
    }
    setSearchOpen((prevOpen) => !prevOpen);
  }

  /** Runs an App-Aktion from actions.ts, if its enabled rule allows it right now. Every entry point
   * (keyboard, menu bar, context menu, toolbar) ends up here. */
  function runAction(id: AppActionId): void {
    if (!isActionEnabled(id, actionContext)) return;
    switch (id) {
      case "newDocument":
        setNewDocOpen(true);
        break;
      case "openFile":
        void handleOpen();
        break;
      case "save":
        void handleSave();
        break;
      case "saveAs":
        void handleSaveAs();
        break;
      case "undo":
        handleUndo();
        break;
      case "redo":
        handleRedo();
        break;
      case "addChild":
        handleSelectionAction("add-child");
        break;
      case "addSibling":
        handleSelectionAction("add-sibling");
        break;
      case "duplicate":
        handleSelectionAction("duplicate");
        break;
      case "delete":
        handleSelectionAction("delete");
        break;
      case "copyPathFull":
        handleCopyPath("full");
        break;
      case "copyPath":
        handleCopyPath("indexed");
        break;
      case "copyPathStatic":
        handleCopyPath("static");
        break;
      case "copyNode":
        handleCopyNode();
        break;
      case "pasteNode":
        void handlePasteNode();
        break;
      case "expandAll":
        expandAllTree();
        break;
      case "collapseAll":
        collapseAllTree();
        break;
      case "search":
        toggleSearch();
        break;
      case "toggleAttributesPanel":
        setSettings({ showAttributesPanel: !settings.showAttributesPanel });
        break;
      case "settings":
        setSettingsOpen(true);
        break;
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const ctrl = event.ctrlKey || event.metaKey;
      if (visibleDialog !== null) {
        // Nothing behind a dialog runs — no save, no edit, no tree navigation. Strg+F is still
        // swallowed so the webview's own find bar does not open over the dialog.
        if (ctrl && event.key.toLowerCase() === "f") event.preventDefault();
        return;
      }
      if (ctrl && event.key.toLowerCase() === "f") {
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
      if (ctrl && event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        runAction("toggleAttributesPanel");
        return;
      }
      if (isTextInput(event.target)) return; // let native text-field undo/typing behave normally

      // Only claimed while enabled: embedded in VS Code, Ctrl+O/N stay VS Code's own shortcuts.
      if (ctrl && event.key.toLowerCase() === "o" && isActionEnabled("openFile", actionContext)) {
        event.preventDefault();
        runAction("openFile");
        return;
      }
      if (ctrl && event.key.toLowerCase() === "n" && isActionEnabled("newDocument", actionContext)) {
        event.preventDefault();
        runAction("newDocument");
        return;
      }
      if (!activeDoc) return;

      const action = resolveShortcut(event, {
        // Bulk-capable actions (delete, duplicate, copy, paste) must stay reachable with several
        // nodes selected, where `selectedRow` is deliberately null.
        hasSelection: selectedRows.length > 0,
        selectionHasChildren: selectedRow?.hasChildren ?? false,
      });
      if (!action) return;
      event.preventDefault();
      switch (action) {
        case "renameStart":
          if (selectedRow) setEditingField({ nodeId: selectedRow.node.id, field: "name" });
          break;
        case "editValueStart":
          if (selectedRow) setEditingField({ nodeId: selectedRow.node.id, field: "value" });
          break;
        case "moveDown":
          moveSelection(1);
          break;
        case "moveUp":
          moveSelection(-1);
          break;
        case "extendDown":
          extendSelectionBy(1);
          break;
        case "extendUp":
          extendSelectionBy(-1);
          break;
        case "arrowRight":
          handleArrowRight();
          break;
        case "arrowLeft":
          handleArrowLeft();
          break;
        default:
          // Every other shortcut is an App-Aktion from actions.ts, under the same enabled rule as
          // its menu entry.
          runAction(action);
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
  function handleReplaceAllInternal(
    options: SearchOptions,
    replacement: string,
    subtreeOnly: boolean,
  ): { replaced: number; skippedInComments: number } {
    if (!activeDoc || !trueRoot || !root) return { replaced: 0, skippedInComments: 0 };
    const searchRoot = resolveSearchRoot(root, subtreeOnly);
    const { command, replacementCount, skippedInComments } = createReplaceAllCommand(
      trueRoot,
      searchRoot,
      options,
      replacement,
    );
    if (command) {
      activeDoc.commandBus.execute(command);
    }
    return { replaced: replacementCount, skippedInComments };
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

  /** Closes tabs and forgets their remembered expand/selection state (see tabViewStateRef
   * above) — otherwise the map would grow forever across a long session of opening/closing tabs. */
  function closeTabsAndForgetView(keys: string[]): void {
    for (const tab of tabs) if (keys.includes(tab.key)) tabViewStateRef.current.delete(tab.id);
    closeTabs(keys);
  }

  /**
   * Closes a set of tabs as one step. Asks first when that would unload documents with unsaved
   * changes — decided by the Workspace against its live state, for the whole set at once, so a
   * full view and a focus tab of the same document closing together still ask (and several
   * changed documents get one dialog instead of stopping at the first).
   */
  function closeTabSet(keys: string[]): void {
    const { dirty } = planClose(keys);
    if (dirty.length === 0) {
      closeTabsAndForgetView(keys);
      return;
    }
    const closing = tabs.filter((tab) => keys.includes(tab.key));
    setClosePrompt({
      kind: "tabs",
      tabs: closing.map((tab) => ({ filePath: tab.filePath, focusNodeId: tab.focusNodeId })),
      dirtyPaths: dirty.map((doc) => doc.filePath),
    });
  }

  function handleCloseTab(key: string): void {
    closeTabSet([key]);
  }

  function handleCopyTabPath(path: string): void {
    void navigator.clipboard.writeText(path).then(
      () => setStatus(t("tabs.pathCopied")),
      (err) => setError(toErrorMessage(err)),
    );
  }

  function handleOpenTabParent(path: string): void {
    void host.openParentFolder(path).then(
      () => setStatus(t("tabs.parentOpened")),
      (err) => setError(toErrorMessage(err)),
    );
  }

  function handleCloseAllTabs(): void { closeTabSet(tabs.map((tab) => tab.key)); }
  function handleCloseOtherTabs(key: string): void { closeTabSet(tabs.filter((tab) => tab.key !== key).map((tab) => tab.key)); }
  function handleCloseTabsToRight(key: string): void {
    const index = tabs.findIndex((tab) => tab.key === key);
    closeTabSet(tabs.slice(index + 1).map((tab) => tab.key));
  }
  function handleCloseTabsToLeft(key: string): void {
    const index = tabs.findIndex((tab) => tab.key === key);
    closeTabSet(tabs.slice(0, index).map((tab) => tab.key));
  }

  async function destroyWindow(): Promise<void> {
    try {
      // destroy(), not close(): close() would re-fire onCloseRequested and re-open the dialog.
      await host.destroyWindow();
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
      if (prompt.kind === "tabs") {
        const savedPaths = new Map<string, string>();
        for (const filePath of prompt.dirtyPaths) {
          const doc = docs.find((d) => d.filePath === filePath);
          const savedPath = doc ? await saveDoc(doc) : filePath;
          if (savedPath === null) return; // save-as cancelled — keep every tab open
          savedPaths.set(filePath, savedPath);
        }
        setClosePrompt(null);
        // A save-as may have renamed a document (and with it every tab key) — re-derive the
        // closing tabs' keys from the paths the saves actually ended up under.
        closeTabsAndForgetView(
          prompt.tabs.map((tab) => tabKey(savedPaths.get(tab.filePath) ?? tab.filePath, tab.focusNodeId)),
        );
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
    if (prompt.kind === "tabs") closeTabsAndForgetView(prompt.tabs.map((tab) => tabKey(tab.filePath, tab.focusNodeId)));
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
    host.openDecodedFile(decoded).then(
      (path) => setStatus(path ? t("base64.openedExternally").replace("{path}", path) : "PDF an VS Code übergeben."),
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
    host.openLog().then(
      (path) => setStatus(t("about.logOpened").replace("{path}", path)),
      (err) => setError(toErrorMessage(err)),
    );
  }

  /** The two comment actions. Only ever one of them applies to a given selection, but both stay
   * visible (greyed out) so the pair is discoverable — with a tooltip saying why. */
  function commentMenuEntries(): ContextMenuItem[] {
    const blocker = actionBlocker("comment-out");
    return [
      {
        label: t("menu.commentOut"),
        disabled: blocker !== null,
        title:
          blocker === "contains-comment"
            ? t("menu.commentOut.containsComment")
            : blocker === "contains-double-hyphen"
              ? t("menu.commentOut.containsDoubleHyphen")
              : undefined,
        onClick: () => handleSelectionAction("comment-out"),
      },
      {
        label: t("menu.uncomment"),
        disabled: actionBlocked("uncomment"),
        onClick: () => handleSelectionAction("uncomment"),
      },
      {
        label: t("menu.addComment"),
        disabled: actionBlocked("add-comment"),
        onClick: () => handleSelectionAction("add-comment"),
      },
      {
        label: t("menu.addCommentChild"),
        disabled: actionBlocked("add-comment-child"),
        onClick: () => handleSelectionAction("add-comment-child"),
      },
    ];
  }

  function buildContextMenuItems(): ContextMenuItem[] {
    const isVisibleRoot = !selectedRow || (root !== null && selectedRow.node === root);
    return [
      actionProps("copyPathFull"),
      actionProps("copyPath"),
      actionProps("copyPathStatic"),
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
      actionProps("addChild"),
      actionProps("duplicate"),
      "separator",
      ...commentMenuEntries(),
      "separator",
      actionProps("copyNode"),
      actionProps("pasteNode"),
      "separator",
      actionProps("delete"),
    ];
  }

  /** Klassische Menüleiste (Vorschlag B der UI-Skizze): dieselben Aktionen wie die kompakte
   * Toolbar und das Kontextmenü, nur über einen anderen Einstiegspunkt — keine eigene Logik. */
  function buildMenuBarMenus(): MenuBarMenu[] {
    const recentFiles = embedded ? [] : getRecentFiles(settings.recentFilesLimit);
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
          actionProps("newDocument"),
          actionProps("openFile"),
          ...recentEntries,
          "separator",
          actionProps("save"),
          actionProps("saveAs"),
        ],
      },
      {
        label: t("menuBar.edit"),
        items: [
          actionProps("undo"),
          actionProps("redo"),
          "separator",
          actionProps("addChild"),
          actionProps("addSibling"),
          actionProps("duplicate"),
          actionProps("delete"),
          "separator",
          actionProps("copyPathFull"),
          actionProps("copyPath"),
          actionProps("copyPathStatic"),
          "separator",
          actionProps("copyNode"),
          actionProps("pasteNode"),
        ],
      },
      {
        label: t("menuBar.view"),
        items: [actionProps("expandAll"), actionProps("collapseAll"), "separator", actionProps("search")],
      },
      {
        label: t("menuBar.tools"),
        items: [
          actionProps("settings"),
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
      selectionCount={selectedRows.length}
      onSetAttribute={handleSetAttribute}
      onRenameAttribute={handleRenameAttribute}
      onCreateAttribute={handleCreateAttribute}
      onDecodeBase64={handleDecodeBase64}
      readOnly={selectedRow !== null && actionBlocker("set-attribute") === "read-only"}
    />
  );

  const searchPanelEl = (dock: SearchDockSide) =>
    activeTab && (
      <SearchPanel
        // Remount per TAB (not just per document): search state (matches, query, filter)
        // holds live node references into one view and must never survive a tab switch —
        // stale matches resolved against a different root crashed computePaths (see test).
        // Two tabs on the same document (full view + a focus tab) must each get their own
        // independent search session too, hence keying on the tab, not the file path — on its
        // stable id, so "Speichern unter" (same nodes, new key) keeps the search and its filter.
        key={activeTab.id}
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
        selectedNodeId={selectedRow?.node.id ?? null}
        documentRevision={revision}
        dockSide={dock}
        onToggleDock={handleToggleSearchDock}
      />
    );

  return (
    <div className="app-shell" style={{ "--editor-font-size": `${settings.editorFontSize}px` } as React.CSSProperties}>
      <header className="app-chrome">
        <MenuBar
          menus={buildMenuBarMenus()}
          brand={<strong>{t("app.title")}</strong>}
          trailing={<span>{activeDoc ? activeDoc.filePath : t("app.tagline")}</span>}
        />
        <div className="app-toolbar">
          <IconButton icon={FilePlus} {...actionProps("newDocument")} />
          <IconButton icon={FolderOpen} {...actionProps("openFile")} />
          <IconButton icon={FloppyDisk} {...actionProps("save")} />
          <span className="app-toolbar__sep" />
          <IconButton icon={ArrowCounterClockwise} {...actionProps("undo")} />
          <IconButton icon={ArrowClockwise} {...actionProps("redo")} />
          <span className="app-toolbar__sep" />
          <IconButton icon={MagnifyingGlass} {...actionProps("search")} />
          <IconButton icon={SidebarSimple} {...actionProps("toggleAttributesPanel")} />
          <div className="app-toolbar__spacer" />
          <IconButton icon={Gear} {...actionProps("settings")} />
        </div>
      </header>
      {!embedded && <TabBar
        tabs={tabs}
        activeKey={activeTab?.key ?? null}
        dirtyPaths={dirtyPaths}
        onActivate={activate}
        onClose={handleCloseTab}
        onCloseAll={handleCloseAllTabs}
        onCloseOthers={handleCloseOtherTabs}
        onCloseToRight={handleCloseTabsToRight}
        onCloseToLeft={handleCloseTabsToLeft}
        onCopyPath={handleCopyTabPath}
        onOpenParentFolder={handleOpenTabParent}
        onReorder={reorderTabs}
        onNewDocument={() => setNewDocOpen(true)}
      />}
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
                selectedIds={selection.ids}
                onToggle={toggleRow}
                onSelect={selectRow}
                editingField={editingField}
                onStartEditName={(row) => setEditingField({ nodeId: row.node.id, field: "name" })}
                onStartEditValue={(row) => setEditingField({ nodeId: row.node.id, field: "value" })}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={() => setEditingField(null)}
                onRowContextMenu={(row, x, y) => {
                  // Right-clicking inside the multi-selection keeps it (the menu then acts on
                  // all of it); right-clicking anywhere else collapses to that one row first.
                  setSelection((current) => selectionForActionOn(current, row.node.id));
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
                showAttributes={settings.showAttributesPanel}
                attributes={attributesPanelEl}
                search={searchPanelEl("right")}
              />
            ) : (
              settings.showAttributesPanel ? attributesPanelEl : null
            )}
          </>
        ) : embedded ? null : (
          <WelcomeScreen
            onOpen={() => void handleOpen()}
            onOpenPath={(path) => void openPath(path)}
            onNew={() => setNewDocOpen(true)}
            recentFilesLimit={settings.recentFilesLimit}
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
      {reloadPrompt && reloadPromptDoc && visibleDialog === "reload" && (
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
            closePrompt.kind === "tabs"
              ? closePrompt.dirtyPaths.map(fileNameOf)
              : docs.filter((d) => d.isDirty).map((d) => fileNameOf(d.filePath))
          }
          onSave={() => void handleClosePromptSave()}
          onDiscard={handleClosePromptDiscard}
          onCancel={() => setClosePrompt(null)}
        />
      )}
      {convertPrompt && (
        <ConvertDialog
          fileName={fileNameOf(convertPrompt.filePath)}
          targetFormat={convertPrompt.targetFormat}
          onConfirm={() => void handleConvertConfirm()}
          onCancel={() => setConvertPrompt(null)}
        />
      )}
    </div>
  );
}
