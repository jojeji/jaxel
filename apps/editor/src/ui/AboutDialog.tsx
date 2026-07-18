import React from "react";
import { useI18n } from "../i18n/index.js";
import logoUrl from "../assets/jaxel-logo.svg";

interface AboutDialogProps {
  version: string | null;
  onClose: () => void;
}

/** "Über Jaxel": version + developer credits, opened via the toolbar info icon. */
export function AboutDialog({ version, onClose }: AboutDialogProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog about-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="about-dialog__header">
          <img className="about-dialog__logo" src={logoUrl} alt="" width={40} height={40} />
          <div>
            <h2>{t("app.title")}</h2>
            <p>{t("app.tagline")}</p>
          </div>
        </div>
        <p className="about-dialog__version">{t("about.version").replace("{v}", version ?? "…")}</p>
        <div>
          <h3>{t("about.developers")}</h3>
          <ul className="about-dialog__developers">
            <li>Joey Lauterbach</li>
            <li>Claude ({t("about.aiAgent")}, Anthropic)</li>
          </ul>
        </div>
        <button className="primary" onClick={onClose}>
          {t("settings.close")}
        </button>
      </div>
    </div>
  );
}
