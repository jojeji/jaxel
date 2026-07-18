import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  cloneSubtree,
  computePaths,
  createCompositeCommand,
  createInsertNodeCommand,
  createMoveNodeCommand,
  createNode,
  createRemoveNodeCommand,
  createRenameAttributeCommand,
  createRenameCommand,
  createSetAttributeCommand,
  createSetValueCommand,
  findAll,
  findAncestorChain,
  findNodeById,
  getPathSegments,
  parseJson,
  parseXml,
  replaceAll,
  serializeJson,
  serializeXml,
  type Command,
  type DocFormat,
  type DocNode,
  type PathSegment,
  type SearchMatch,
  type SearchOptions,
} from "@jaxel/core";
import {
  ClipboardText,
  CopySimple,
  FilePlus,
  FloppyDisk,
  FolderOpen,
  Gear,
  Info,
  ListNumbers,
  MagnifyingGlass,
  Plus,
  TextAa,
  Trash,
} from "@phosphor-icons/react";
import { useI18n } from "./i18n/index.js";
import { tabKey, useJaxelDocuments, type OpenDocumentState } from "./state/document-store.js";
import { useSettings } from "./state/settings-store.js";
import { getLastDir, rememberLastDir, addRecentFile, getStoredSession, storeSession } from "./state/local-prefs.js";
import { TreeView, type DropPosition, type EditingField } from "./tree/TreeView.js";
import { FocusBreadcrumb } from "./tree/FocusBreadcrumb.js";
import { flattenTree, type TreeRow } from "./tree/flatten.js";
import { buildFilterKeepSet, flattenFiltered } from "./tree/filter.js";
import { AttributesPanel } from "./panels/AttributesPanel.js";
import { SearchPanel } from "./search/SearchPanel.js";
import { TabBar } from "./tabs/TabBar.js";
import { SettingsDialog } from "./settings/SettingsDialog.js";
import { WelcomeScreen } from "./welcome/WelcomeScreen.js";
import { NewDocumentDialog } from "./welcome/NewDocumentDialog.js";
import { IconButton } from "./ui/IconButton.js";
import { ContextMenu, type ContextMenuItem } from "./ui/ContextMenu.js";
import { ReloadDialog } from "./ui/ReloadDialog.js";
import { CloseConfirmDialog } from "./ui/CloseConfirmDialog.js";
import { AboutDialog } from "./ui/AboutDialog.js";

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

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
    reloadFile,
  } = useJaxelDocuments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [revealNodeId, setRevealNodeId] = useState<string | null>(null);
  /** null = filter off; otherwise the current search matches the tree is reduced to. */
  const [filterMatches, setFilterMatches] = useState<SearchMatch[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [reloadPrompt, setReloadPrompt] = useState<{ filePath: string; isDirty: boolean } | null>(null);
  /** Pending "ungespeicherte Änderungen" question: a single tab close, or the whole window. */
  const [closePrompt, setClosePrompt] = useState<
    { kind: "tab"; key: string; filePath: string; focusNodeId: string | null } | { kind: "window" } | null
  >(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

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

  // Light is the CSS default (:root); only dark needs the data attribute.
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
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
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);
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

  // Reset per-tab view state whenever the active TAB changes (not just the document — switching
  // between the full view and a focus tab of the same document is also a fresh view context).
  useEffect(() => {
    setSelectedId(null);
    setEditingField(null);
    setFilterMatches(null);
    const visibleRootId = focus ? focus.node.id : activeDoc?.document.root.id;
    setExpanded(visibleRootId ? new Set([visibleRootId]) : new Set());
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

  const selectedRow = useMemo<TreeRow | null>(
    () => rows.find((row) => row.node.id === selectedId) ?? null,
    [rows, selectedId],
  );

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
  async function performReload(filePath: string): Promise<void> {
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
        expandedSegmentsList.push(getPathSegments(node, findAncestorChain(trueRoot, node) ?? []));
      }
    }
    const { selectedId: newSelectedId, expandedIds } = await reloadFile(filePath, selectionSegments, expandedSegmentsList);
    if (isActiveDoc) {
      setSelectedId(newSelectedId);
      setExpanded(new Set(expandedIds));
    }
    setStatus(t("reload.reloaded").replace("{name}", fileNameOf(filePath)));
  }

  // External-change detection (docs/entscheidungen.md 2026-07-18 #4): checked only when the
  // window regains focus (no background file watcher), only for the active tab's document
  // (a background tab is checked lazily once the user switches to it), and via cheap
  // metadata (mtime+size) rather than re-reading the file — see stat_file in src-tauri.
  useEffect(() => {
    function handleFocus(): void {
      if (!activeDoc || activeDoc.isUntitled) return;
      const { filePath, isDirty, lastKnownMtimeMs, lastKnownSize } = activeDoc;
      invoke<{ mtimeMs: number; size: number }>("stat_file", { path: filePath })
        .then((stat) => {
          if (stat.mtimeMs === lastKnownMtimeMs && stat.size === lastKnownSize) return; // unchanged
          if (!isDirty && settings.autoReloadOnExternalChange) {
            void performReload(filePath);
          } else {
            setReloadPrompt({ filePath, isDirty });
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
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
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

  /** Drag&drop move in the tree; targetIndex semantics per createMoveNodeCommand's contract. */
  function handleMoveNode(source: TreeRow, target: TreeRow, position: DropPosition): void {
    if (!activeDoc) return;
    const sourceParent = source.ancestors[source.ancestors.length - 1];
    if (!sourceParent) return; // root is not draggable
    const sourceAncestors = source.ancestors.slice(0, -1);
    const sourceIndex = sourceParent.children.indexOf(source.node);
    if (sourceIndex === -1) return;

    let targetParent: DocNode;
    let targetAncestors: DocNode[];
    let targetIndex: number;
    if (position === "into") {
      targetParent = target.node;
      targetAncestors = target.ancestors;
      targetIndex = target.node.children.length;
    } else {
      const parent = target.ancestors[target.ancestors.length - 1];
      if (!parent) return; // the root has no siblings
      targetParent = parent;
      targetAncestors = target.ancestors.slice(0, -1);
      const anchorIndex = parent.children.indexOf(target.node);
      if (anchorIndex === -1) return;
      targetIndex = position === "after" ? anchorIndex + 1 : anchorIndex;
    }
    if (targetParent === sourceParent && targetIndex > sourceIndex) {
      targetIndex -= 1; // contract: targetIndex counts AFTER the source was removed
    }
    if (targetParent === sourceParent && targetIndex === sourceIndex) return; // no-op move

    activeDoc.commandBus.execute(
      createMoveNodeCommand(sourceParent, sourceIndex, sourceAncestors, targetParent, targetIndex, targetAncestors),
    );
    if (position === "into") {
      setExpanded((prev) => new Set(prev).add(targetParent.id));
    }
    setSelectedId(source.node.id);
    setRevealNodeId(source.node.id);
  }

  /** Strg+Plus / toolbar: insert a child and jump straight into naming it. */
  function handleAddChild(): void {
    if (!activeDoc || !selectedRow) return;
    const child = createNode({ name: "node" });
    activeDoc.commandBus.execute(
      createInsertNodeCommand(selectedRow.node, selectedRow.node.children.length, child, selectedRow.ancestors),
    );
    setExpanded((prev) => new Set(prev).add(selectedRow.node.id));
    setSelectedId(child.id);
    setRevealNodeId(child.id);
    setEditingField({ nodeId: child.id, field: "name" });
  }

  function handleDelete(): void {
    if (!activeDoc || !selectedRow || selectedRow.ancestors.length === 0) return; // can't delete the root
    const parent = selectedRow.ancestors[selectedRow.ancestors.length - 1]!;
    const parentAncestors = selectedRow.ancestors.slice(0, -1);
    const index = parent.children.indexOf(selectedRow.node);
    if (index === -1) return;
    activeDoc.commandBus.execute(createRemoveNodeCommand(parent, index, parentAncestors));
    setSelectedId(null);
    setEditingField(null);
  }

  /** Strg+D: deep-copy the selected node and insert it as its next sibling. */
  function handleDuplicate(): void {
    if (!activeDoc || !selectedRow || selectedRow.ancestors.length === 0) return; // root can't be duplicated
    const parent = selectedRow.ancestors[selectedRow.ancestors.length - 1]!;
    const parentAncestors = selectedRow.ancestors.slice(0, -1);
    const index = parent.children.indexOf(selectedRow.node);
    if (index === -1) return;
    const copy = cloneSubtree(selectedRow.node);
    activeDoc.commandBus.execute(createInsertNodeCommand(parent, index + 1, copy, parentAncestors));
    setSelectedId(copy.id);
    setRevealNodeId(copy.id);
  }

  /** Strg+C: serialize the selected subtree (XML fragment / single-key JSON) to the system clipboard. */
  function handleCopyNode(): void {
    if (!activeDoc || !selectedRow) return;
    const indent = activeDoc.document.indent;
    const text =
      activeDoc.format === "xml"
        ? serializeXml({ root: selectedRow.node, indent }).trimEnd()
        : serializeJson({ root: selectedRow.node, indent });
    void navigator.clipboard.writeText(text).then(
      () => setStatus(t("clipboard.nodeCopied")),
      (err) => setError(err instanceof Error ? err.message : String(err)),
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
      fragmentRoot = activeDoc.format === "xml" ? parseXml(text).root : parseJson(text).root;
    } catch {
      setError(t("clipboard.invalidFragment"));
      return;
    }
    if (fragmentRoot.synthetic) {
      // A bare JSON array/primitive/multi-key object has no name to insert under.
      setError(t("clipboard.invalidFragment"));
      return;
    }
    const pasted = cloneSubtree(fragmentRoot);
    if (selectedRow.ancestors.length === 0) {
      activeDoc.commandBus.execute(
        createInsertNodeCommand(selectedRow.node, selectedRow.node.children.length, pasted, selectedRow.ancestors),
      );
      setExpanded((prev) => new Set(prev).add(selectedRow.node.id));
    } else {
      const parent = selectedRow.ancestors[selectedRow.ancestors.length - 1]!;
      const parentAncestors = selectedRow.ancestors.slice(0, -1);
      const index = parent.children.indexOf(selectedRow.node);
      if (index === -1) return;
      activeDoc.commandBus.execute(createInsertNodeCommand(parent, index + 1, pasted, parentAncestors));
    }
    setSelectedId(pasted.id);
    setRevealNodeId(pasted.id);
  }

  function moveSelection(delta: number): void {
    if (rows.length === 0) return;
    const currentIndex = selectedRow ? rows.findIndex((row) => row.node.id === selectedRow.node.id) : -1;
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : rows.length - 1
        : Math.min(rows.length - 1, Math.max(0, currentIndex + delta));
    const next = rows[nextIndex];
    if (next) {
      setSelectedId(next.node.id);
      setRevealNodeId(next.node.id);
    }
  }

  function handleArrowRight(): void {
    if (!selectedRow) return;
    if (!selectedRow.hasChildren) return;
    if (!expanded.has(selectedRow.node.id)) {
      setExpanded((prev) => new Set(prev).add(selectedRow.node.id));
    } else {
      const firstChild = selectedRow.node.children[0];
      if (firstChild) {
        setSelectedId(firstChild.id);
        setRevealNodeId(firstChild.id);
      }
    }
  }

  function handleArrowLeft(): void {
    if (!selectedRow) return;
    if (selectedRow.hasChildren && expanded.has(selectedRow.node.id)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(selectedRow.node.id);
        return next;
      });
      return;
    }
    const parent = selectedRow.ancestors[selectedRow.ancestors.length - 1];
    if (parent) {
      setSelectedId(parent.id);
      setRevealNodeId(parent.id);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTextInput(event.target)) return; // let native text-field undo/typing behave normally
      const ctrl = event.ctrlKey || event.metaKey;

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

      if (ctrl && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave();
      } else if (ctrl && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        activeDoc.commandBus.undo();
      } else if (
        (ctrl && event.shiftKey && event.key.toLowerCase() === "z") ||
        (ctrl && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        activeDoc.commandBus.redo();
      } else if (event.key === "F2" && selectedRow) {
        event.preventDefault();
        setEditingField({ nodeId: selectedRow.node.id, field: "name" });
      } else if (event.key === "Enter" && selectedRow && !selectedRow.hasChildren) {
        event.preventDefault();
        setEditingField({ nodeId: selectedRow.node.id, field: "value" });
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedRow) {
        event.preventDefault();
        handleDelete();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleArrowRight();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleArrowLeft();
      } else if (ctrl && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicate();
      } else if (ctrl && event.shiftKey && event.key.toLowerCase() === "c" && selectedRow) {
        event.preventDefault();
        handleCopyPath("full");
      } else if (ctrl && !event.shiftKey && event.key.toLowerCase() === "c" && selectedRow) {
        event.preventDefault();
        handleCopyNode();
      } else if (ctrl && event.key.toLowerCase() === "v" && selectedRow) {
        event.preventDefault();
        void handlePasteNode();
      } else if (ctrl && (event.key === "+" || event.code === "NumpadAdd")) {
        event.preventDefault();
        handleAddChild();
      } else if (ctrl && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleSearch(options: SearchOptions, subtreeOnly: boolean): SearchMatch[] {
    if (!activeDoc || !root) return [];
    // "Whole document" defaults to the tab's own visible root — in a focus tab that's the
    // focused subtree, not the real document root (see docs/entscheidungen.md 2026-07-18 #1).
    const searchRoot = subtreeOnly && selectedRow ? selectedRow.node : root;
    return findAll(searchRoot, options);
  }

  function handleNavigate(match: SearchMatch): void {
    if (!activeDoc) return;
    selectAndReveal(match.node);
  }

  function getMatchPath(match: SearchMatch): string {
    if (!root) return "";
    // Defensive: a match can stem from an older document state (stale render right
    // around a tab switch or after structural edits) — never let path resolution
    // crash the whole app over a result-list label.
    try {
      return computePaths(root, match.node).indexed;
    } catch {
      return "";
    }
  }

  /**
   * Runs replaceAll (which mutates the tree directly, see search.ts), then reverses each
   * touched field back to its pre-replace text and re-applies it through the matching
   * mutation Command (createRenameCommand/createSetValueCommand/createSetAttributeCommand),
   * wrapped in one CompositeCommand — so "Alle ersetzen" is a single, real undo step instead
   * of an untracked direct mutation.
   */
  function handleReplaceAllInternal(options: SearchOptions, replacement: string, subtreeOnly: boolean): number {
    if (!activeDoc || !trueRoot || !root) return 0;
    // Ancestor chains below are always traced from the real trueRoot (needed for byteRange
    // invalidation up to the true document root, see commands/byte-range.ts) — only the
    // search/replace scope itself narrows to the selected subtree (or the tab's own visible
    // root, e.g. the focused subtree — see docs/entscheidungen.md 2026-07-18 #1).
    const searchRoot = subtreeOnly && selectedRow ? selectedRow.node : root;
    const matches = findAll(searchRoot, options);
    if (matches.length === 0) return 0;

    interface Touched {
      node: DocNode;
      ancestors: DocNode[];
      kind: "name" | "value" | "attribute";
      attributeName?: string;
      before: string;
    }
    const touched = new Map<string, Touched>();
    for (const match of matches) {
      const key = `${match.node.id}|${match.matchedIn}|${match.attributeName ?? ""}`;
      if (touched.has(key)) continue;
      const ancestors = findAncestorChain(trueRoot, match.node) ?? [];
      if (match.matchedIn === "name") {
        touched.set(key, { node: match.node, ancestors, kind: "name", before: match.node.name });
      } else if (match.matchedIn === "value") {
        touched.set(key, { node: match.node, ancestors, kind: "value", before: match.node.value ?? "" });
      } else if (match.matchedIn === "attribute" && match.attributeName) {
        const attr = match.node.attributes.find((a) => a.name === match.attributeName);
        touched.set(key, {
          node: match.node,
          ancestors,
          kind: "attribute",
          attributeName: match.attributeName,
          before: attr?.value ?? "",
        });
      }
    }

    const count = replaceAll(searchRoot, options, replacement); // mutates directly, see search.ts

    const commands: Command[] = [];
    for (const entry of touched.values()) {
      if (entry.kind === "name") {
        const after = entry.node.name;
        entry.node.name = entry.before; // revert so the Command's own do() re-applies cleanly
        commands.push(createRenameCommand(entry.node, after, entry.ancestors));
      } else if (entry.kind === "value") {
        const after = entry.node.value ?? "";
        entry.node.value = entry.before;
        commands.push(createSetValueCommand(entry.node, after, entry.node.jsonType, entry.ancestors));
      } else if (entry.kind === "attribute" && entry.attributeName) {
        const attr = entry.node.attributes.find((a) => a.name === entry.attributeName);
        if (!attr) continue;
        const after = attr.value;
        attr.value = entry.before;
        commands.push(createSetAttributeCommand(entry.node, entry.attributeName, after, entry.ancestors));
      }
    }
    if (commands.length > 0) {
      activeDoc.commandBus.execute(createCompositeCommand(t("search.replaceAll"), commands));
    }
    return count;
  }

  function handleCopyPath(kind: "indexed" | "static" | "full"): void {
    if (!activeDoc || !selectedRow || !root) return;
    const paths = computePaths(root, selectedRow.node);
    void navigator.clipboard.writeText(paths[kind]).then(
      () => setStatus(t("toolbar.pathCopied")),
      (err) => setError(err instanceof Error ? err.message : String(err)),
    );
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
    closeTab(key);
  }

  async function destroyWindow(): Promise<void> {
    try {
      // destroy(), not close(): close() would re-fire onCloseRequested and re-open the dialog.
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        closeTab(tabKey(savedPath, prompt.focusNodeId));
      } else {
        for (const doc of docs.filter((d) => d.isDirty)) {
          if ((await saveDoc(doc)) === null) return; // cancelled — abort the window close
        }
        setClosePrompt(null);
        await destroyWindow();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleClosePromptDiscard(): void {
    const prompt = closePrompt;
    if (!prompt) return;
    setClosePrompt(null);
    if (prompt.kind === "tab") closeTab(prompt.key);
    else void destroyWindow();
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

  function buildContextMenuItems(): ContextMenuItem[] {
    const ctrl = t("key.ctrl");
    const isRoot = !selectedRow || selectedRow.ancestors.length === 0;
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
      "separator",
      { label: t("toolbar.addChild"), shortcut: `${ctrl}++`, onClick: handleAddChild },
      { label: t("toolbar.duplicate"), shortcut: `${ctrl}+D`, disabled: isRoot, onClick: handleDuplicate },
      "separator",
      { label: t("menu.copyNode"), shortcut: `${ctrl}+C`, onClick: handleCopyNode },
      { label: t("menu.pasteNode"), shortcut: `${ctrl}+V`, onClick: () => void handlePasteNode() },
      "separator",
      { label: t("toolbar.delete"), shortcut: t("key.delete"), disabled: isRoot, onClick: handleDelete },
    ];
  }

  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <div className="app-titlebar__brand">
          <strong>{t("app.title")}</strong>
          <span>{activeDoc ? activeDoc.filePath : t("app.tagline")}</span>
        </div>
        <div className="app-titlebar__actions">
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
          <IconButton
            icon={MagnifyingGlass}
            label={t("toolbar.search")}
            shortcut={`${t("key.ctrl")}+F`}
            disabled={!activeDoc}
            onClick={() => setSearchOpen((prevOpen) => !prevOpen)}
          />
          <span className="app-titlebar__sep" />
          <IconButton
            icon={Plus}
            label={t("toolbar.addChild")}
            shortcut={`${t("key.ctrl")}++`}
            disabled={!selectedRow}
            onClick={handleAddChild}
          />
          <IconButton
            icon={CopySimple}
            label={t("toolbar.duplicate")}
            shortcut={`${t("key.ctrl")}+D`}
            disabled={!selectedRow || selectedRow.ancestors.length === 0}
            onClick={handleDuplicate}
          />
          <IconButton
            icon={Trash}
            label={t("toolbar.delete")}
            shortcut={t("key.delete")}
            disabled={!selectedRow || selectedRow.ancestors.length === 0}
            onClick={handleDelete}
          />
          <span className="app-titlebar__sep" />
          <IconButton
            icon={ListNumbers}
            label={t("toolbar.copyPath")}
            disabled={!selectedRow}
            onClick={() => handleCopyPath("indexed")}
          />
          <IconButton
            icon={TextAa}
            label={t("toolbar.copyPathStatic")}
            disabled={!selectedRow}
            onClick={() => handleCopyPath("static")}
          />
          <IconButton
            icon={ClipboardText}
            label={t("toolbar.copyPathFull")}
            shortcut={`${t("key.ctrl")}+Shift+C`}
            disabled={!selectedRow}
            onClick={() => handleCopyPath("full")}
          />
          <span className="app-titlebar__sep" />
          <IconButton icon={Gear} label={t("toolbar.settings")} onClick={() => setSettingsOpen(true)} />
          <IconButton icon={Info} label={t("toolbar.about")} onClick={() => setAboutOpen(true)} />
        </div>
      </header>
      <TabBar
        tabs={tabs}
        activeKey={activeTab?.key ?? null}
        onActivate={activate}
        onClose={handleCloseTab}
        onNewDocument={() => setNewDocOpen(true)}
      />
      {error && <div className="app-error">{error}</div>}
      {status && <div className="app-status">{status}</div>}
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
                revealNodeId={revealNodeId}
              />
            </div>
            <AttributesPanel
              node={selectedRow?.node ?? null}
              onSetAttribute={handleSetAttribute}
              onRenameAttribute={handleRenameAttribute}
              onCreateAttribute={handleCreateAttribute}
            />
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
      {searchOpen && activeDoc && activeTab && (
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
          getMatchPath={getMatchPath}
          onClose={() => setSearchOpen(false)}
          hasSelection={selectedRow !== null}
        />
      )}
      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
      {newDocOpen && <NewDocumentDialog onChoose={handleNew} onClose={() => setNewDocOpen(false)} />}
      {aboutOpen && <AboutDialog version={appVersion} onClose={() => setAboutOpen(false)} />}
      {reloadPrompt && (
        <ReloadDialog
          fileName={fileNameOf(reloadPrompt.filePath)}
          isDirty={reloadPrompt.isDirty}
          onReload={() => void performReload(reloadPrompt.filePath)}
          onKeepMine={() => setReloadPrompt(null)}
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
