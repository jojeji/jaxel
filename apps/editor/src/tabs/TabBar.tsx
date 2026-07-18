import React from "react";
import { useI18n } from "../i18n/index.js";
import type { TabState } from "../state/document-store.js";

interface TabBarProps {
  tabs: TabState[];
  activeKey: string | null;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
  onNewDocument: () => void;
}

function fileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/** Focus tabs show "<node name> — <file name>" so they're distinguishable from the full-view
 * tab of the same document; `focusLabel` is a snapshot (see document-store.ts) so this never
 * needs to walk the (possibly huge) tree just to render a label. */
function tabLabel(tab: TabState): string {
  const name = fileName(tab.filePath);
  return tab.focusLabel ? `${tab.focusLabel} — ${name}` : name;
}

export function TabBar({ tabs, activeKey, onActivate, onClose, onNewDocument }: TabBarProps): React.ReactElement | null {
  const { t } = useI18n();
  if (tabs.length === 0) return null;

  return (
    <div
      className="tab-bar"
      title={t("tabs.newDocumentHint")}
      onClick={(event) => {
        // Nur Klicks auf die freie Fläche rechts neben den Tabs, nicht auf Tabs selbst.
        if (event.target === event.currentTarget) onNewDocument();
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className={`tab${tab.key === activeKey ? " tab--active" : ""}`}
          title={tab.filePath}
          onClick={() => onActivate(tab.key)}
        >
          <span className="tab__label">{tabLabel(tab)}</span>
          <button
            className="tab__close"
            title={t("tabs.close")}
            onClick={(event) => {
              event.stopPropagation();
              onClose(tab.key);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
