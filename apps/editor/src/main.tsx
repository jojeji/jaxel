import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { I18nProvider } from "./i18n/index.js";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root-Element nicht gefunden.");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </React.StrictMode>,
);
