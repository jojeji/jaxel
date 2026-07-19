// Einzige Logging-Brücke des Frontends (AP15, siehe .scratch/ap15-crash-logging/spec.md).
// Fire-and-forget: ein Fehler beim Loggen selbst darf die App nie stören (Story 15).
import { invoke } from "@tauri-apps/api/core";

type LogLevel = "info" | "warn" | "error";

function logToBackend(level: LogLevel, source: string, message: string): void {
  void invoke("log_frontend", { level, message: `[${source}] ${message}` }).catch(() => {});
}

export function logInfo(source: string, message: string): void {
  logToBackend("info", source, message);
}

export function logWarn(source: string, message: string): void {
  logToBackend("warn", source, message);
}

export function logError(source: string, message: string): void {
  logToBackend("error", source, message);
}

function describeError(reason: unknown): string {
  if (reason instanceof Error) return `${reason.message}\n${reason.stack ?? ""}`.trim();
  return String(reason);
}

/** Registriert globale window.onerror-/unhandledrejection-Handler (Story 2, 3). */
export function installGlobalErrorLogging(): () => void {
  function handleError(event: ErrorEvent): void {
    const details = event.error !== undefined ? describeError(event.error) : event.message;
    logError("onerror", details);
  }
  function handleRejection(event: PromiseRejectionEvent): void {
    logError("unhandledrejection", describeError(event.reason));
  }
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
