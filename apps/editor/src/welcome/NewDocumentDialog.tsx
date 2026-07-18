import React from "react";
import type { DocFormat } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface NewDocumentDialogProps {
  onChoose: (format: DocFormat) => void;
  onClose: () => void;
}

/** Small format-choice dialog for "Neu" — see docs/entscheidungen.md 2026-07-18 #3. */
export function NewDocumentDialog({ onChoose, onClose }: NewDocumentDialogProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{t("newDoc.title")}</h2>
        <div className="new-doc-dialog__choices">
          <button className="primary" onClick={() => onChoose("xml")}>
            {t("newDoc.xml")}
          </button>
          <button className="primary" onClick={() => onChoose("json")}>
            {t("newDoc.json")}
          </button>
        </div>
      </div>
    </div>
  );
}
