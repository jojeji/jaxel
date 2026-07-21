import React, { useEffect, useRef } from "react";
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
  const reloadRef = useRef<HTMLButtonElement>(null);
  const keepMineRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    (isDirty ? keepMineRef : reloadRef).current?.focus();
    const previouslyFocused = previouslyFocusedRef.current;
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isDirty]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onKeepMine();
      return;
    }
    if (event.key !== "Tab") return;

    const reload = reloadRef.current;
    const keepMine = keepMineRef.current;
    if (!reload || !keepMine) return;
    if (event.shiftKey && document.activeElement === reload) {
      event.preventDefault();
      keepMine.focus();
    } else if (!event.shiftKey && document.activeElement === keepMine) {
      event.preventDefault();
      reload.focus();
    }
  }

  return (
    <div className="settings-overlay" onKeyDown={handleKeyDown}>
      <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="reload-dialog-title">
        <h2 id="reload-dialog-title">{t("reload.title")}</h2>
        <p>{message}</p>
        <div className="new-doc-dialog__choices">
          <button ref={reloadRef} className={isDirty ? undefined : "primary"} onClick={onReload}>
            {t("reload.reload")}
          </button>
          <button ref={keepMineRef} className={isDirty ? "primary" : undefined} onClick={onKeepMine}>
            {t("reload.keepMine")}
          </button>
        </div>
      </div>
    </div>
  );
}
