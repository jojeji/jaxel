import React from "react";
import { useI18n } from "../i18n/index.js";

interface ReloadDialogProps {
  fileName: string;
  /** Whether this document has unsaved local edits — changes the message, not the choice
   * offered (see docs/entscheidungen.md 2026-07-18 #4: this dialog always appears in that
   * case, even with "automatisch neu laden" enabled). */
  isDirty: boolean;
  onReload: () => void;
  onKeepMine: () => void;
}

/** Asks whether to reload a document that changed on disk since it was loaded/saved. */
export function ReloadDialog({ fileName, isDirty, onReload, onKeepMine }: ReloadDialogProps): React.ReactElement {
  const { t } = useI18n();
  const message = t(isDirty ? "reload.messageDirty" : "reload.messageClean").replace("{name}", fileName);

  return (
    <div className="settings-overlay" onClick={onKeepMine}>
      <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{t("reload.title")}</h2>
        <p>{message}</p>
        <div className="new-doc-dialog__choices">
          <button className="primary" onClick={onReload}>
            {t("reload.reload")}
          </button>
          <button onClick={onKeepMine}>{t("reload.keepMine")}</button>
        </div>
      </div>
    </div>
  );
}
