import type { DecodedBase64 } from "@jaxel/core";
import { invoke } from "@tauri-apps/api/core";

export interface HostFileContent {
  content: string;
  encoding: string;
  /** The file started with a byte order mark (stripped from `content`, restored on save).
   * Absent from hosts that do not report it — treated as no BOM. */
  bom?: boolean;
  mtimeMs: number;
  size: number;
}

export interface HostFileStat {
  mtimeMs: number;
  size: number;
}

export type HostMode = "standalone" | "vscode";
export type HostFileDropEvent = { type: "enter" | "over" | "leave" | "drop"; paths: string[] };

export interface JaxelHost {
  readonly mode: HostMode;
  readTextFile(path: string): Promise<HostFileContent>;
  writeTextFile(path: string, content: string, encoding: string, bom?: boolean): Promise<HostFileStat>;
  statFile(path: string): Promise<HostFileStat>;
  pickOpenFile(defaultPath?: string | null): Promise<string | null>;
  pickSaveFile(defaultPath: string, extensions: string[]): Promise<string | null>;
  getVersion(): Promise<string | null>;
  takePendingOpenPaths(): Promise<string[]>;
  onPendingOpenPaths(handler: () => void): () => void;
  onCloseRequested(handler: (event: { preventDefault: () => void }) => void): () => void;
  onFileDrop(handler: (event: HostFileDropEvent) => void): () => void;
  destroyWindow(): Promise<void>;
  openParentFolder(path: string): Promise<string>;
  openDecodedFile(decoded: DecodedBase64): Promise<string>;
  openLog(): Promise<string>;
  log(level: "info" | "warn" | "error", source: string, message: string): Promise<void>;
  /** Resolves the document supplied by an embedding host; standalone has no initial document. */
  getInitialDocument(): Promise<{ path: string; file: HostFileContent } | null>;
  notifyDirty(dirty: boolean): void;
  onRequestCurrentContent(handler: (requestId: string) => void): () => void;
  onRequestSession(handler: (requestId: string) => void): () => void;
  onSaved(handler: (revision?: number, text?: string, stat?: HostFileStat) => void): () => void;
  respondCurrentContent(requestId: string, text: string, revision: number): void;
  respondSession(requestId: string, session: unknown): void;
}

type Message = { type: string; [key: string]: unknown };
type VsCodeApi = { postMessage(message: Message): void };

interface VscodeWindow extends Window {
  acquireVsCodeApi?: () => VsCodeApi;
}

function randomRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  }
  return btoa(binary);
}

function createTauriHost(): JaxelHost {
  return {
    mode: "standalone",
    async readTextFile(path) {
      return invoke<HostFileContent>("read_text_file", { path });
    },
    async writeTextFile(path, content, encoding, bom) {
      return invoke<HostFileStat>("write_text_file", { path, content, encoding, bom: bom ?? false });
    },
    async statFile(path) {
      return invoke<HostFileStat>("stat_file", { path });
    },
    async pickOpenFile(defaultPath) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({
        multiple: false,
        defaultPath: defaultPath ?? undefined,
        filters: [{ name: "XML/JSON/EXT", extensions: ["xml", "json", "ext"] }],
      });
      return typeof result === "string" ? result : null;
    },
    async pickSaveFile(defaultPath, extensions) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const result = await save({ defaultPath, filters: [{ name: "XML/JSON", extensions }] });
      return typeof result === "string" ? result : null;
    },
    async getVersion() {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        return await getVersion();
      } catch {
        return null;
      }
    },
    takePendingOpenPaths: async () => {
      return invoke<string[]>("take_pending_open_paths");
    },
    onPendingOpenPaths(handler) {
      let disposed = false;
      let unlisten: (() => void) | null = null;
      void import("@tauri-apps/api/event").then(({ listen }) =>
        listen("jaxel://pending-open-paths", handler).then((dispose) => {
          if (disposed) dispose();
          else unlisten = dispose;
        }),
      ).catch(() => {});
      return () => {
        disposed = true;
        unlisten?.();
      };
    },
    onCloseRequested(handler) {
      let disposed = false;
      let unlisten: (() => void) | null = null;
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
        getCurrentWindow().onCloseRequested(handler).then((dispose) => {
          if (disposed) dispose();
          else unlisten = dispose;
        }),
      ).catch(() => {});
      return () => {
        disposed = true;
        unlisten?.();
      };
    },
    onFileDrop(handler) {
      if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return () => {};
      let cancelled = false;
      let unlisten: (() => void) | null = null;
      void import("@tauri-apps/api/webview").then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          handler(event.payload as HostFileDropEvent);
        }).then((dispose) => {
          if (cancelled) dispose();
          else unlisten = dispose;
        }),
      ).catch(() => {});
      return () => {
        cancelled = true;
        unlisten?.();
      };
    },
    async destroyWindow() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    },
    async openParentFolder(path) {
      return invoke<string>("open_parent_folder", { path });
    },
    async openDecodedFile(decoded) {
      return invoke<string>("open_decoded_file", { dataBase64: bytesToBase64(decoded.bytes), extension: decoded.extension });
    },
    async openLog() {
      return invoke<string>("open_log");
    },
    async log(level, source, message) {
      await invoke("log_frontend", { level, message: `[${source}] ${message}` });
    },
    getInitialDocument: async () => null,
    notifyDirty: () => {},
    onRequestCurrentContent: () => () => {},
    onRequestSession: () => () => {},
    onSaved: () => () => {},
    respondCurrentContent: () => {},
    respondSession: () => {},
  };
}

function createVscodeHost(): JaxelHost {
  const acquireVsCodeApi = (window as VscodeWindow).acquireVsCodeApi;
  if (!acquireVsCodeApi) throw new Error("Jaxel-VS-Code-Host konnte nicht initialisiert werden.");
  const vscode = acquireVsCodeApi();

  const pending = new Map<string, { resolve: (value: any) => void; reject: (error: unknown) => void }>();
  const currentContentHandlers = new Set<(requestId: string) => void>();
  const sessionHandlers = new Set<(requestId: string) => void>();
  const savedHandlers = new Set<(revision?: number, text?: string, stat?: HostFileStat) => void>();
  const initial = { value: null as { path: string; file: HostFileContent } | null };
  const messageHandler = (event: MessageEvent<Message>) => {
    const message = event.data;
    if (!message || typeof message.type !== "string") return;
    if (message.type === "init") {
      initial.value = {
        path: String(message.path),
        file: {
          content: String(message.text ?? ""),
          encoding: String(message.encoding ?? "UTF-8"),
          mtimeMs: Number(message.mtimeMs ?? 0),
          size: Number(message.size ?? 0),
        },
      };
      const requestId = typeof message.requestId === "string" ? message.requestId : null;
      if (requestId) pending.get(requestId)?.resolve(initial.value);
      return;
    }
    if (message.type === "requestCurrentContent" && typeof message.requestId === "string") {
      currentContentHandlers.forEach((handler) => handler(message.requestId as string));
      return;
    }
    if (message.type === "requestSession" && typeof message.requestId === "string") {
      sessionHandlers.forEach((handler) => handler(message.requestId as string));
      return;
    }
    if (message.type === "saved") {
      const stat = typeof message.mtimeMs === "number" && typeof message.size === "number"
        ? { mtimeMs: message.mtimeMs, size: message.size }
        : undefined;
      savedHandlers.forEach((handler) => handler(
        typeof message.revision === "number" ? message.revision : undefined,
        typeof message.text === "string" ? message.text : undefined,
        stat,
      ));
      return;
    }
    const requestId = typeof message.requestId === "string" ? message.requestId : null;
    if (!requestId) return;
    const waiter = pending.get(requestId);
    if (!waiter) return;
    pending.delete(requestId);
    if (message.error) waiter.reject(new Error(String(message.error)));
    else waiter.resolve(message);
  };
  window.addEventListener("message", messageHandler);

  function request<T>(message: Message, responseType: string): Promise<T> {
    const requestId = randomRequestId();
    return new Promise<T>((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      vscode.postMessage({ ...message, requestId, responseType });
    });
  }

  const host: JaxelHost = {
    mode: "vscode",
    async getInitialDocument() {
      if (initial.value) return initial.value;
      return request<{ path: string; file: HostFileContent }>({ type: "ready" }, "init");
    },
    async readTextFile(path) {
      if (initial.value?.path === path) return initial.value.file;
      return request<HostFileContent>({ type: "readFile", path }, "readFileResponse");
    },
    async writeTextFile(path, content, encoding, bom) {
      return request<HostFileStat>({ type: "writeFile", path, content, encoding, bom: bom ?? false }, "writeFileResponse");
    },
    statFile: (path) => request<HostFileStat>({ type: "statFile", path }, "statFileResponse"),
    pickOpenFile: (defaultPath) => request<string | null>({ type: "pickOpenFile", defaultPath: defaultPath ?? undefined }, "pickOpenFileResponse"),
    pickSaveFile: (defaultPath, extensions) => request<string | null>({ type: "pickSaveFile", defaultPath, extensions }, "pickSaveFileResponse"),
    getVersion: async () => null,
    takePendingOpenPaths: async () => [],
    onPendingOpenPaths: () => () => {},
    onCloseRequested: () => () => {},
    onFileDrop: () => () => {},
    destroyWindow: async () => {},
    openParentFolder: async () => "",
    async openDecodedFile(decoded) {
      if (decoded.kind !== "pdf") throw new Error("Nur PDF-Inhalte können an VS Code übergeben werden.");
      await request({ type: "openBase64Pdf", data: decoded.bytes }, "openBase64PdfResponse");
      return "";
    },
    openLog: async () => { throw new Error("Das Öffnen der Logdatei ist im VS-Code-Modus nicht verfügbar."); },
    log: async (level, source, message) => {
      vscode.postMessage({ type: "log", level, source, message });
    },
    notifyDirty(dirty) {
      vscode.postMessage({ type: "dirtyChanged", dirty });
    },
    onRequestCurrentContent(handler) {
      currentContentHandlers.add(handler);
      return () => currentContentHandlers.delete(handler);
    },
    onRequestSession(handler) {
      sessionHandlers.add(handler);
      return () => sessionHandlers.delete(handler);
    },
    onSaved(handler) {
      savedHandlers.add(handler);
      return () => savedHandlers.delete(handler);
    },
    respondCurrentContent(requestId, text, revision) {
      vscode.postMessage({ type: "currentContentResponse", requestId, text, revision });
    },
    respondSession(requestId, session) {
      vscode.postMessage({ type: "sessionResponse", requestId, session });
    },
  };
  return host;
}

const configuredHost = (window as VscodeWindow).acquireVsCodeApi ? createVscodeHost : createTauriHost;
let host: JaxelHost | undefined;

export function getJaxelHost(): JaxelHost {
  return host ??= configuredHost();
}
