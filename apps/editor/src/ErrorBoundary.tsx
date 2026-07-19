import React from "react";
import { useI18n } from "./i18n/index.js";
import { logError } from "./logging.js";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

function ErrorFallback({ error }: { error: Error }): React.ReactElement {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>{t("errorPage.title")}</h1>
      <p>{t("errorPage.hint")}</p>
      <pre>{error.message}</pre>
    </div>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError("errorboundary", `${error.message}\n${error.stack ?? ""}\n${info.componentStack ?? ""}`.trim());
  }

  override render(): React.ReactNode {
    if (this.state.error) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}
