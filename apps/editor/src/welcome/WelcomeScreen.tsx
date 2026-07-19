import React from "react";
import { useI18n } from "../i18n/index.js";
import { getRecentFiles } from "../state/local-prefs.js";
import logoUrl from "../assets/jaxel-logo.svg";

interface WelcomeScreenProps {
  onOpen: () => void;
  onOpenPath: (path: string) => void;
  onNew: () => void;
}

function fileName(path: string): string {
  const separator = path.includes("\\") ? "\\" : "/";
  return path.slice(path.lastIndexOf(separator) + 1);
}

/**
 * Start screen when no document is open: brand, open button, "Zuletzt geöffnet"
 * list and the keyboard-shortcut overview. Drag&drop onto the window is handled
 * globally in App (Tauri drag-drop event), the hint here just advertises it.
 */
export function WelcomeScreen({ onOpen, onOpenPath, onNew }: WelcomeScreenProps): React.ReactElement {
  const { t } = useI18n();
  const recent = getRecentFiles();
  const ctrl = t("key.ctrl");

  const shortcuts: Array<[string, string]> = [
    [`${ctrl}+N`, t("shortcut.new")],
    [`${ctrl}+O`, t("shortcut.open")],
    [`${ctrl}+S`, t("shortcut.save")],
    [`${ctrl}+F`, t("shortcut.search")],
    ["↑ ↓ ← →", t("shortcut.navigate")],
    ["F2", t("shortcut.rename")],
    ["Enter", t("shortcut.editValue")],
    [`${ctrl}+D`, t("shortcut.duplicate")],
    [`${ctrl}+C / ${ctrl}+V`, t("shortcut.copyPaste")],
    [`${ctrl}++`, t("shortcut.addSibling")],
    [`${ctrl}+Shift++`, t("shortcut.addChild")],
    [t("key.delete"), t("shortcut.delete")],
    [`${ctrl}+Z`, t("shortcut.undo")],
  ];

  return (
    <div className="welcome">
      <div className="welcome__inner">
        <div className="welcome__brand">
          <img className="welcome__logo" src={logoUrl} alt="" width={64} height={64} />
          <div>
            <h1>{t("app.title")}</h1>
            <p>{t("app.tagline")}</p>
          </div>
        </div>

        <div className="welcome__open">
          <button className="primary" onClick={onOpen}>
            {t("welcome.openFile")}
          </button>
          <button onClick={onNew}>{t("welcome.newDocument")}</button>
          <span className="welcome__drop-hint">{t("welcome.dropHint")}</span>
        </div>

        {recent.length > 0 && (
          <section className="welcome__section">
            <h2>{t("welcome.recent")}</h2>
            <ul className="welcome__recent">
              {recent.map((path) => (
                <li key={path}>
                  <button className="welcome__recent-entry" onClick={() => onOpenPath(path)}>
                    <span className="welcome__recent-name">{fileName(path)}</span>
                    <span className="welcome__recent-path">{path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="welcome__section">
          <h2>{t("welcome.shortcuts")}</h2>
          <dl className="welcome__shortcuts">
            {shortcuts.map(([keys, label]) => (
              <div className="welcome__shortcut" key={keys}>
                <dt>
                  <kbd>{keys}</kbd>
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
