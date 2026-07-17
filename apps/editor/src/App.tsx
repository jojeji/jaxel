import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
  parseJson,
  parseXml,
  replaceAll,
  serializeJson,
  serializeXml,
  type Command,
  type DocNode,
  type SearchMatch,
  type SearchOptions,
} from "@jaxel/core";
import {
  ClipboardText,
  CopySimple,
  FloppyDisk,
  FolderOpen,
  Gear,
  ListNumbers,
  MagnifyingGlass,
  Plus,
  TextAa,
  Trash,
} from "@phosphor-icons/react";
import { useI18n } from "./i18n/index.js";
import { useJaxelDocuments } from "./state/document-store.js";
import { useSettings } from "./state/settings-store.js";
import { getLastDir, rememberLastDir, addRecentFile } from "./state/local-prefs.js";
import { TreeView, type DropPosition, type EditingField } from "./tree/TreeView.js";
import { flattenTree, type TreeRow } from "./tree/flatten.js";
import { buildFilterKeepSet, flattenFiltered } from "./tree/filter.js";
import { AttributesPanel } from "./panels/AttributesPanel.js";
import { SearchPanel } from "./search/SearchPanel.js";
import { TabBar } from "./tabs/TabBar.js";
import { SettingsDialog } from "./settings/SettingsDialog.js";
import { WelcomeScreen } from "./welcome/WelcomeScreen.js";
import { IconButton } from "./ui/IconButton.js";
import { ContextMenu, type ContextMenuItem } from "./ui/ContextMenu.js";

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function App(): React.ReactElement {
  const { t } = useI18n();
  const { settings, setSettings } = useSettings();
  const { docs, activeDoc, openFile, saveFile, closeTab, activate } = useJaxelDocuments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revealNodeId, setRevealNodeId] = useState<string | null>(null);
  /** null = filter off; otherwise the current search matches the tree is reduced to. */
  const [filterMatches, setFilterMatches] = useState<SearchMatch[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const root = activeDoc?.document.root ?? null;
  const revision = activeDoc?.document.revision ?? 0;

  // Light is the CSS default (:root); only dark needs the data attribute.
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [settings.theme]);

  // Files passed on the command line (`jaxel some.xml`) or a future "open with" file
  // association arrive here — the backend queues them until the frontend is ready to pull them.
  useEffect(() => {
    invoke<string[]>("take_pending_open_paths").then((paths) => {
      const first = paths[0];
      if (first) void openFile(first);
    });
  }, [openFile]);

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

  // Reset per-document view state whenever the active tab changes.
  useEffect(() => {
    setSelectedId(null);
    setEditingField(null);
    setFilterMatches(null);
    setExpanded(activeDoc ? new Set([activeDoc.document.root.id]) : new Set());
  }, [activeDoc?.filePath]);

  /**
   * The flattened, currently visible row list. Normal mode: expand/collapse driven.
   * Filter mode (search panel): reduced to matches + ancestors (+ subtree per setting),
   * ignoring the expanded set. `revision` invalidates on every mutation (commands
   * mutate the tree in place, `root`'s reference never changes — see TreeView docs).
   */
  const rows = useMemo<TreeRow[]>(() => {
    if (!root) return [];
    if (filterMatches) {
      const matchedIds = new Set(filterMatches.map((m) => m.node.id));
      const keep = buildFilterKeepSet(root, matchedIds, settings.filterIncludesSubtree);
      return flattenFiltered(root, keep);
    }
    return flattenTree(root, expanded);
  }, [root, expanded, revision, filterMatches, settings.filterIncludesSubtree]);

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

  async function handleSave(): Promise<void> {
    setError(null);
    try {
      await saveFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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

  function handleSearch(options: SearchOptions): SearchMatch[] {
    if (!activeDoc) return [];
    return findAll(activeDoc.document.root, options);
  }

  function handleNavigate(match: SearchMatch): void {
    if (!activeDoc) return;
    selectAndReveal(match.node);
  }

  function getMatchPath(match: SearchMatch): string {
    if (!root) return "";
    return computePaths(root, match.node).indexed;
  }

  /**
   * Runs replaceAll (which mutates the tree directly, see search.ts), then reverses each
   * touched field back to its pre-replace text and re-applies it through the matching
   * mutation Command (createRenameCommand/createSetValueCommand/createSetAttributeCommand),
   * wrapped in one CompositeCommand — so "Alle ersetzen" is a single, real undo step instead
   * of an untracked direct mutation.
   */
  function handleReplaceAllInternal(options: SearchOptions, replacement: string): number {
    if (!activeDoc) return 0;
    const docRoot = activeDoc.document.root;
    const matches = findAll(docRoot, options);
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
      const ancestors = findAncestorChain(docRoot, match.node) ?? [];
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

    const count = replaceAll(docRoot, options, replacement); // mutates directly, see search.ts

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

  function handleCloseTab(path: string): void {
    closeTab(path);
  }

  function buildContextMenuItems(): ContextMenuItem[] {
    const ctrl = t("key.ctrl");
    const isRoot = !selectedRow || selectedRow.ancestors.length === 0;
    return [
      {
        label: t("toolbar.copyPathFull"),
        shortcut: `${ctrl}+Shift+C`,
        onClick: () => handleCopyPath("full"),
      },
      { label: t("toolbar.copyPath"), onClick: () => handleCopyPath("indexed") },
      { label: t("toolbar.copyPathStatic"), onClick: () => handleCopyPath("static") },
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
        </div>
      </header>
      <TabBar docs={docs} activePath={activeDoc?.filePath ?? null} onActivate={activate} onClose={handleCloseTab} />
      {error && <div className="app-error">{error}</div>}
      {status && <div className="app-status">{status}</div>}
      <main className="app-main">
        {activeDoc ? (
          <>
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
            <AttributesPanel
              node={selectedRow?.node ?? null}
              onSetAttribute={handleSetAttribute}
              onRenameAttribute={handleRenameAttribute}
              onCreateAttribute={handleCreateAttribute}
            />
          </>
        ) : (
          <WelcomeScreen onOpen={() => void handleOpen()} onOpenPath={(path) => void openPath(path)} />
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
      {searchOpen && activeDoc && (
        <SearchPanel
          onSearch={handleSearch}
          onNavigate={handleNavigate}
          onReplaceAll={handleReplaceAllInternal}
          onFilterChange={setFilterMatches}
          getMatchPath={getMatchPath}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
