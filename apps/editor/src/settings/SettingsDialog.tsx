import React from "react";
import { useI18n, type Locale } from "../i18n/index.js";
import type { Settings, Theme, WindowMode } from "../state/settings-store.js";

interface SettingsDialogProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["light", "dark", "nordlicht", "tanne", "terrakotta", "kobalt", "kontrast"];

export function SettingsDialog({ settings, onChange, onClose }: SettingsDialogProps): React.ReactElement {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{t("settings.title")}</h2>

        <fieldset className="settings-dialog__theme-grid">
          <legend>{t("settings.theme")}</legend>
          {THEMES.map((theme) => (
            <label key={theme}>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === theme}
                onChange={() => onChange({ theme })}
              />
              {t(`settings.theme.${theme}`)}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t("settings.language")}</legend>
          <label>
            <input type="radio" name="locale" checked={locale === "de"} onChange={() => setLocale("de" as Locale)} />
            Deutsch
          </label>
          <label>
            <input type="radio" name="locale" checked={locale === "en"} onChange={() => setLocale("en" as Locale)} />
            English
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("settings.search")}</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.filterIncludesSubtree}
              onChange={(event) => onChange({ filterIncludesSubtree: event.target.checked })}
            />
            {t("settings.filterSubtree")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.searchShowNamespaces}
              onChange={(event) => onChange({ searchShowNamespaces: event.target.checked })}
            />
            {t("settings.searchShowNamespaces")}
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("settings.externalChanges")}</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.autoReloadOnExternalChange}
              onChange={(event) => onChange({ autoReloadOnExternalChange: event.target.checked })}
            />
            {t("settings.autoReload")}
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("settings.tree")}</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.showTreeChangeMarkers}
              onChange={(event) => onChange({ showTreeChangeMarkers: event.target.checked })}
            />
            {t("settings.showTreeChangeMarkers")}
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("settings.startup")}</legend>
          <label>
            <input
              type="checkbox"
              checked={settings.restoreSession}
              onChange={(event) => onChange({ restoreSession: event.target.checked })}
            />
            {t("settings.restoreSession")}
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("settings.windowMode")}</legend>
          <label>
            <input
              type="radio"
              name="windowMode"
              checked={settings.windowMode === "tabs"}
              onChange={() => onChange({ windowMode: "tabs" as WindowMode })}
            />
            {t("settings.windowMode.tabs")}
          </label>
          <label className="settings-dialog__disabled-option" title={t("settings.windowMode.comingSoon")}>
            <input type="radio" name="windowMode" checked={false} disabled />
            {t("settings.windowMode.windows")} ({t("settings.windowMode.comingSoon")})
          </label>
        </fieldset>

        <button className="primary" onClick={onClose}>
          {t("settings.close")}
        </button>
      </div>
    </div>
  );
}
