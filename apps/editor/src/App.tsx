import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  createInsertNodeCommand,
  createNode,
  createRemoveNodeCommand,
  createRenameCommand,
  createSetAttributeCommand,
  createSetValueCommand,
} from "@jaxel/core";
import { useI18n } from "./i18n/index.js";
import { useJaxelDocument } from "./state/document-store.js";
import { TreeView, type EditingField } from "./tree/TreeView.js";
import type { TreeRow } from "./tree/flatten.js";
import { AttributesPanel } from "./panels/AttributesPanel.js";

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
          {selectedRow && <button onClick={handleAddChild}>{t("toolbar.addChild")}</button>}
          {selectedRow && <button onClick={handleDelete}>{t("toolbar.delete")}</button>}
          <button onClick={() => setLocale(locale === "de" ? "en" : "de")}>
            {locale === "de" ? "DE" : "EN"}
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </header>
      {error && <div className="app-error">{error}</div>}
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
