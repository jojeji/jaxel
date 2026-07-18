import React from "react";
import { useI18n } from "../i18n/index.js";

interface Base64PreviewDialogProps {
  /** Decoded TEXT content — binary content never reaches this dialog (it goes straight to
   * the OS default application via the open_decoded_file command). */
  text: string;
  /** Set when the text parses as one of Jaxel's document formats — enables "open as tab". */
  format: "xml" | "json" | null;
  onOpenAsTab: () => void;
  onClose: () => void;
}

/** Read-only preview of a decoded Base64 text payload (docs/entscheidungen.md 2026-07-18:
 * Dekodieren ist reine Ansicht, kein Rückweg). */
export function Base64PreviewDialog({ text, format, onOpenAsTab, onClose }: Base64PreviewDialogProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog base64-preview" onClick={(event) => event.stopPropagation()}>
        <h2>{t("base64.previewTitle")}</h2>
        <pre className="base64-preview__text">{text}</pre>
        <div className="new-doc-dialog__choices">
          {format && (
            <button className="primary" onClick={onOpenAsTab}>
              {t("base64.openAsTab")}
            </button>
          )}
          <button onClick={onClose}>{t("base64.close")}</button>
        </div>
      </div>
    </div>
  );
}
