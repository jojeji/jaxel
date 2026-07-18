import React from "react";
import { useI18n } from "../i18n/index.js";

interface CloseConfirmDialogProps {
  /** Display names of every document that would lose unsaved changes — one name when a
   * single tab closes, all dirty documents when the whole window closes. */
  fileNames: string[];
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Asks what to do with unsaved changes before a tab or the window closes. A click on the
 * overlay counts as "Abbrechen" — closing must never silently discard work. */
export function CloseConfirmDialog({
  fileNames,
  onSave,
  onDiscard,
  onCancel,
}: CloseConfirmDialogProps): React.ReactElement {
  const { t } = useI18n();
  const single = fileNames.length === 1;
  const message = single
    ? t("close.messageOne").replace("{name}", fileNames[0]!)
    : t("close.messageMany").replace("{count}", String(fileNames.length));

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{t("close.title")}</h2>
        <p>{message}</p>
        {!single && (
          <ul className="close-dialog__files">
            {fileNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        <div className="new-doc-dialog__choices">
          <button className="primary" onClick={onSave}>
            {t(single ? "close.save" : "close.saveAll")}
          </button>
          <button onClick={onDiscard}>{t("close.discard")}</button>
          <button onClick={onCancel}>{t("close.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
