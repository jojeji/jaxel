import React from "react";
import { useI18n } from "../i18n/index.js";
import type { OpenDocumentState } from "../state/document-store.js";

interface TabBarProps {
  docs: OpenDocumentState[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

function fileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

export function TabBar({ docs, activePath, onActivate, onClose }: TabBarProps): React.ReactElement | null {
  const { t } = useI18n();
  if (docs.length === 0) return null;

  return (
    <div className="tab-bar">
      {docs.map((doc) => (
        <div
          key={doc.filePath}
          className={`tab${doc.filePath === activePath ? " tab--active" : ""}`}
          title={doc.filePath}
          onClick={() => onActivate(doc.filePath)}
        >
          <span className="tab__label">{fileName(doc.filePath)}</span>
          <button
            className="tab__close"
            title={t("tabs.close")}
            onClick={(event) => {
              event.stopPropagation();
              onClose(doc.filePath);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
