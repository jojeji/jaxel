import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  computePaths,
  createCompositeCommand,
  createInsertNodeCommand,
  createNode,
  createRemoveNodeCommand,
  createRenameCommand,
  createSetAttributeCommand,
  createSetValueCommand,
  findAll,
  findAncestorChain,
  replaceAll,
  type Command,
  type DocNode,
  type SearchMatch,
  type SearchOptions,
} from "@jaxel/core";
import { useI18n } from "./i18n/index.js";
import { useJaxelDocument } from "./state/document-store.js";
import { TreeView, type EditingField } from "./tree/TreeView.js";
import type { TreeRow } from "./tree/flatten.js";
import { AttributesPanel } from "./panels/AttributesPanel.js";
import { SearchBar } from "./search/SearchBar.js";

type Theme = "dark" | "light";

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function App(): React.ReactElement {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<Theme>("dark");
  const { state, openFile, saveFile } = useJaxelDocument();
  const [selectedRow, setSelectedRow] = useState<TreeRow | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [revealNodeId, setRevealNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme]);

  // Files passed on the command line (`jaxel some.xml`) or a future "open with" file
  // association arrive here — the backend queues them until the frontend is ready to pull them.
  useEffect(() => {
    invoke<string[]>("take_pending_open_paths").then((paths) => {
      const first = paths[0];
      if (first) void openFile(first);
    });
  }, [openFile]);

  // Clear selection/editing whenever a new document is opened.
  useEffect(() => {
    setSelectedRow(null);
    setEditingField(null);
  }, [state?.filePath]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTextInput(event.target)) return; // let native text-field undo/typing behave normally
      if (!state) return;

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        state.commandBus.undo();
      } else if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        state.commandBus.redo();
      } else if (event.key === "F2" && selectedRow) {
        event.preventDefault();
        setEditingField({ nodeId: selectedRow.node.id, field: "name" });
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedRow) {
        event.preventDefault();
        handleDelete();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, selectedRow]);

  async function handleOpen(): Promise<void> {
    setError(null);
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "XML/JSON", extensions: ["xml", "json"] }],
      });
      if (typeof path === "string") {
        await openFile(path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
    if (!state) return;
    setEditingField(null);
    if (field === "name") {
      if (newText === row.node.name || newText.trim() === "") return;
      state.commandBus.execute(createRenameCommand(row.node, newText, row.ancestors));
    } else {
      if (newText === (row.node.value ?? "")) return;
      state.commandBus.execute(createSetValueCommand(row.node, newText, row.node.jsonType, row.ancestors));
    }
  }

  function handleSetAttribute(name: string, value: string | null): void {
    if (!state || !selectedRow) return;
    state.commandBus.execute(
      createSetAttributeCommand(selectedRow.node, name, value, selectedRow.ancestors),
    );
  }

  function handleAddChild(): void {
    if (!state || !selectedRow) return;
    const child = createNode({ name: "node" });
    state.commandBus.execute(
      createInsertNodeCommand(selectedRow.node, selectedRow.node.children.length, child, selectedRow.ancestors),
    );
  }

  function handleDelete(): void {
    if (!state || !selectedRow || selectedRow.ancestors.length === 0) return; // can't delete the root
    const parent = selectedRow.ancestors[selectedRow.ancestors.length - 1]!;
    const parentAncestors = selectedRow.ancestors.slice(0, -1);
    const index = parent.children.indexOf(selectedRow.node);
    if (index === -1) return;
    state.commandBus.execute(createRemoveNodeCommand(parent, index, parentAncestors));
    setSelectedRow(null);
    setEditingField(null);
  }

  function handleSearch(options: SearchOptions): SearchMatch[] {
    if (!state) return [];
    return findAll(state.document.root, options);
  }

  function handleNavigate(match: SearchMatch): void {
    if (!state) return;
    const ancestors = findAncestorChain(state.document.root, match.node);
    if (!ancestors) return;
    setSelectedRow({
      node: match.node,
      ancestors,
      depth: ancestors.length,
      hasChildren: match.node.children.length > 0,
    });
    setRevealNodeId(match.node.id);
  }

  /**
   * Runs replaceAll (which mutates the tree directly, see search.ts), then reverses each
   * touched field back to its pre-replace text and re-applies it through the matching
   * mutation Command (createRenameCommand/createSetValueCommand/createSetAttributeCommand),
   * wrapped in one CompositeCommand — so "Alle ersetzen" is a single, real undo step instead
   * of an untracked direct mutation.
   */
  function handleReplaceAllInternal(options: SearchOptions, replacement: string): number {
    if (!state) return 0;
    const root = state.document.root;
    const matches = findAll(root, options);
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
      const ancestors = findAncestorChain(root, match.node) ?? [];
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

    const count = replaceAll(root, options, replacement); // mutates directly, see search.ts

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
      state.commandBus.execute(createCompositeCommand(t("search.replaceAll"), commands));
    }
    return count;
  }

  function handleCopyPath(indexed: boolean): void {
    if (!state || !selectedRow) return;
    const paths = computePaths(state.document.root, selectedRow.node);
    void navigator.clipboard.writeText(indexed ? paths.indexed : paths.static).then(
      () => setStatus(t("toolbar.pathCopied")),
      (err) => setError(err instanceof Error ? err.message : String(err)),
    );
  }

  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <div className="app-titlebar__brand">
          <strong>{t("app.title")}</strong>
          <span>{state ? state.filePath : t("app.tagline")}</span>
        </div>
        <div className="app-titlebar__actions">
          <button onClick={handleOpen}>{t("welcome.openFile")}</button>
          {state && <button onClick={handleSave}>{t("welcome.save")}</button>}
          {state && <button onClick={() => setSearchOpen((open) => !open)}>{t("toolbar.search")}</button>}
          {selectedRow && <button onClick={handleAddChild}>{t("toolbar.addChild")}</button>}
          {selectedRow && <button onClick={handleDelete}>{t("toolbar.delete")}</button>}
          {selectedRow && <button onClick={() => handleCopyPath(true)}>{t("toolbar.copyPath")}</button>}
          {selectedRow && (
            <button onClick={() => handleCopyPath(false)}>{t("toolbar.copyPathStatic")}</button>
          )}
          <button onClick={() => setLocale(locale === "de" ? "en" : "de")}>
            {locale === "de" ? "DE" : "EN"}
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </header>
      {searchOpen && state && (
        <SearchBar
          onSearch={handleSearch}
          onNavigate={handleNavigate}
          onReplaceAll={handleReplaceAllInternal}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {error && <div className="app-error">{error}</div>}
      {status && <div className="app-status">{status}</div>}
      <main className="app-main">
        {state ? (
          <>
            <TreeView
              root={state.document.root}
              revision={state.document.revision}
              selectedId={selectedRow?.node.id ?? null}
              onSelect={setSelectedRow}
              editingField={editingField}
              onStartEditName={(row) => setEditingField({ nodeId: row.node.id, field: "name" })}
              onStartEditValue={(row) => setEditingField({ nodeId: row.node.id, field: "value" })}
              onCommitEdit={handleCommitEdit}
              onCancelEdit={() => setEditingField(null)}
              revealNodeId={revealNodeId}
            />
            <AttributesPanel node={selectedRow?.node ?? null} onSetAttribute={handleSetAttribute} />
          </>
        ) : (
          <button className="primary" onClick={handleOpen}>
            {t("welcome.openFile")}
          </button>
        )}
      </main>
    </div>
  );
}
