import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "./i18n/index.js";
import { useJaxelDocument } from "./state/document-store.js";
import { TreeView } from "./tree/TreeView.js";
import type { TreeRow } from "./tree/flatten.js";

type Theme = "dark" | "light";

export function App(): React.ReactElement {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<Theme>("dark");
  const { state, openFile, saveFile } = useJaxelDocument();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  async function handleOpen(): Promise<void> {
    setError(null);
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "XML/JSON", extensions: ["xml", "json"] }],
      });
      if (typeof path === "string") {
        await openFile(path);
        setSelectedId(null);
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

  function handleSelect(row: TreeRow): void {
    setSelectedId(row.node.id);
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
          <TreeView root={state.document.root} selectedId={selectedId} onSelect={handleSelect} />
        ) : (
          <button className="primary" onClick={handleOpen}>
            {t("welcome.openFile")}
          </button>
        )}
      </main>
    </div>
  );
}
