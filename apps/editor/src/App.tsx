import React, { useEffect, useState } from "react";
import { useI18n } from "./i18n/index.js";

type Theme = "dark" | "light";

export function App(): React.ReactElement {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <div className="app-titlebar__brand">
          <strong>{t("app.title")}</strong>
          <span>{t("app.tagline")}</span>
        </div>
        <div className="app-titlebar__actions">
          <button onClick={() => setLocale(locale === "de" ? "en" : "de")}>
            {locale === "de" ? "DE" : "EN"}
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </header>
      <main className="app-main">
        <button className="primary">{t("welcome.openFile")}</button>
      </main>
    </div>
  );
}
