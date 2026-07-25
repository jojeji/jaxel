import React from "react";
import type { DocFormat } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface ConvertDialogProps {
  /** Display name of the document being converted. */
  fileName: string;
  /** Format the document will have afterwards — the source format is the other one. */
  targetFormat: DocFormat;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks before "Speichern unter" converts between XML and JSON. The extension in the file
 * dialog is easy to change by accident, and the conversion is not a pure save: it replaces the
 * tree and therefore drops the undo history. A click on the overlay counts as "Abbrechen".
 */
export function ConvertDialog({
  fileName,
  targetFormat,
  onConfirm,
  onCancel,
}: ConvertDialogProps): React.ReactElement {
  const { t } = useI18n();
  const targetLabel = targetFormat.toUpperCase();
  const losses =
    targetFormat === "json"
      ? [t("convert.loss.comments"), t("convert.loss.undo")]
      : [t("convert.loss.types"), t("convert.loss.undo")];

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{t("convert.title").replace("{target}", targetLabel)}</h2>
        <p>{t("convert.message").replace("{name}", fileName).replaceAll("{target}", targetLabel)}</p>
        <ul className="close-dialog__files">
          {losses.map((loss) => (
            <li key={loss}>{loss}</li>
          ))}
        </ul>
        <p className="convert-dialog__note">
          {t(targetFormat === "json" ? "convert.note.attributes" : "convert.note.attributesBack")}
        </p>
        <div className="new-doc-dialog__choices">
          <button className="primary" onClick={onConfirm}>
            {t("convert.confirm")}
          </button>
          <button onClick={onCancel}>{t("convert.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
