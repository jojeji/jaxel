import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CommandBus,
  createDocument,
  parseJson,
  parseXml,
  serializeJson,
  serializeXmlMinimal,
  type DocFormat,
  type DocNode,
  type JaxelDocument,
} from "@jaxel/core";

export interface OpenDocumentState {
  filePath: string;
  format: DocFormat;
  document: JaxelDocument;
  commandBus: CommandBus;
  /** Raw text as last read from (or written to) disk — the baseline for XML's minimal-invasive save. */
  sourceText: string;
  encoding: string;
}

interface DocsState {
  docs: OpenDocumentState[];
  activePath: string | null;
}

function detectFormat(path: string, content: string): DocFormat {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xml")) return "xml";
  return content.trimStart().startsWith("<") ? "xml" : "json";
}

/**
 * Manages every currently open document as tabs (the default multi-window mode, see
 * docs/entscheidungen.md #5). Documents are keyed by `filePath` — opening a path that's
 * already open just activates its existing tab instead of creating a duplicate.
 */
export function useJaxelDocuments(): {
  docs: OpenDocumentState[];
  activeDoc: OpenDocumentState | null;
  revision: number;
  openFile: (path: string) => Promise<void>;
  saveFile: (path?: string) => Promise<void>;
  closeTab: (path: string) => void;
  activate: (path: string) => void;
} {
  const [state, setState] = useState<DocsState>({ docs: [], activePath: null });
  const [revision, setRevision] = useState(0);
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const openFile = useCallback(async (path: string) => {
    const result = await invoke<{ content: string; encoding: string }>("read_text_file", { path });
    const format = detectFormat(path, result.content);

    let root: DocNode;
    let xmlDeclaration: string | undefined;
    if (format === "xml") {
      const parsed = parseXml(result.content);
      root = parsed.root;
      xmlDeclaration = parsed.xmlDeclaration;
    } else {
      root = parseJson(result.content).root;
    }

    const doc = createDocument({ format, root, encoding: result.encoding, xmlDeclaration });
    const commandBus = new CommandBus(doc);
    const unsubscribe = commandBus.subscribe(() => setRevision((r) => r + 1));

    setState((prev) => {
      if (prev.docs.some((d) => d.filePath === path)) {
        unsubscribe(); // already open — discard this duplicate parse/subscription, just activate the tab
        return { ...prev, activePath: path };
      }
      unsubscribersRef.current.set(path, unsubscribe);
      const newDoc: OpenDocumentState = {
        filePath: path,
        format,
        document: doc,
        commandBus,
        sourceText: result.content,
        encoding: result.encoding,
      };
      return { docs: [...prev.docs, newDoc], activePath: path };
    });
    setRevision((r) => r + 1);
  }, []);

  const saveFile = useCallback(async (path?: string) => {
    const targetPath = path ?? stateRef.current.activePath;
    const target = stateRef.current.docs.find((d) => d.filePath === targetPath);
    if (!target) return;
    const text =
      target.format === "xml"
        ? serializeXmlMinimal(target.sourceText, { root: target.document.root, indent: target.document.indent })
        : serializeJson({ root: target.document.root, indent: target.document.indent });
    await invoke("write_text_file", { path: target.filePath, content: text, encoding: target.encoding });
    // The file on disk now matches the tree again — that becomes the new minimal-invasive baseline.
    setState((current) => ({
      ...current,
      docs: current.docs.map((d) => (d.filePath === target.filePath ? { ...d, sourceText: text } : d)),
    }));
  }, []);

  const closeTab = useCallback((path: string) => {
    setState((prev) => {
      const closingIndex = prev.docs.findIndex((d) => d.filePath === path);
      if (closingIndex === -1) return prev;
      unsubscribersRef.current.get(path)?.();
      unsubscribersRef.current.delete(path);
      const nextDocs = prev.docs.filter((d) => d.filePath !== path);
      let nextActive = prev.activePath;
      if (prev.activePath === path) {
        const neighbor = nextDocs[closingIndex] ?? nextDocs[closingIndex - 1] ?? null;
        nextActive = neighbor?.filePath ?? null;
      }
      return { docs: nextDocs, activePath: nextActive };
    });
  }, []);

  const activate = useCallback((path: string) => {
    setState((prev) => (prev.docs.some((d) => d.filePath === path) ? { ...prev, activePath: path } : prev));
  }, []);

  const activeDoc = state.docs.find((d) => d.filePath === state.activePath) ?? null;

  return { docs: state.docs, activeDoc, revision, openFile, saveFile, closeTab, activate };
}
