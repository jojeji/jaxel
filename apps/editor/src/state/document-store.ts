import { useCallback, useRef, useState } from "react";
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

function detectFormat(path: string, content: string): DocFormat {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xml")) return "xml";
  return content.trimStart().startsWith("<") ? "xml" : "json";
}

export function useJaxelDocument(): {
  state: OpenDocumentState | null;
  revision: number;
  openFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
} {
  const [state, setState] = useState<OpenDocumentState | null>(null);
  const [revision, setRevision] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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

    unsubscribeRef.current?.();
    unsubscribeRef.current = commandBus.subscribe(() => setRevision((r) => r + 1));

    setState({
      filePath: path,
      format,
      document: doc,
      commandBus,
      sourceText: result.content,
      encoding: result.encoding,
    });
    setRevision((r) => r + 1);
  }, []);

  const saveFile = useCallback(async () => {
    if (!state) return;
    const text =
      state.format === "xml"
        ? serializeXmlMinimal(state.sourceText, { root: state.document.root, indent: state.document.indent })
        : serializeJson({ root: state.document.root, indent: state.document.indent });
    await invoke("write_text_file", { path: state.filePath, content: text, encoding: state.encoding });
    // The file on disk now matches the tree again — that becomes the new minimal-invasive baseline.
    setState((prev) => (prev ? { ...prev, sourceText: text } : prev));
  }, [state]);

  return { state, revision, openFile, saveFile };
}
