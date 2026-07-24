import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logInfo } from "../logging.js";
import {
  CommandBus,
  captureChangeBaseline,
  createDocument,
  findAncestorChain,
  findNodeById,
  getPathSegments,
  parseJson,
  parseXml,
  resolveNodeBySegments,
  serializeJson,
  serializeXmlMinimal,
  syncByteRangesAfterSave,
  type ChangeBaseline,
  type DocFormat,
  type DocNode,
  type JaxelDocument,
  type PathSegment,
} from "@jaxel/core";

export interface OpenDocumentState {
  filePath: string;
  format: DocFormat;
  document: JaxelDocument;
  commandBus: CommandBus;
  /** Raw text as last read from (or written to) disk — the baseline for XML's minimal-invasive save. */
  sourceText: string;
  encoding: string;
  /** True for a brand-new document that has never been saved — `filePath` is a placeholder
   * ("Unbenannt-N"), not a real path. Saving must go through "save as" first. */
  isUntitled?: boolean;
  /** True once any command has executed since the last load/save/reload. Drives the
   * external-change conflict rule (docs/entscheidungen.md 2026-07-18 #4): a reload may only
   * happen automatically while this is false — with unsaved changes, the dialog always asks. */
  isDirty: boolean;
  /** Snapshot of the tree at the last load/save/reload — the reference point for the optional
   * tree change markers/tombstones (see @jaxel/core computeChanges, CONTEXT.md "Baseline").
   * Recaptured at every point that also calls commandBus.markSaved(). */
  changeBaseline: ChangeBaseline;
  /** File identity at last load/save/reload — mtime + size, for the cheap external-change
   * check (deliberately not a full re-read; files can be several 100 MB). 0/0 for an untitled
   * document, which has no file on disk yet. */
  lastKnownMtimeMs: number;
  lastKnownSize: number;
}

/**
 * One visible tab. `focusNodeId` is set for a "focused view ab Knoten X" tab (see
 * docs/entscheidungen.md 2026-07-18 #1): several tabs — the full view plus any number of
 * foci — can point at the SAME document simultaneously, sharing its CommandBus/undo/save.
 * A tab is identified by (filePath, focusNodeId): at most one tab exists per combination.
 */
export interface TabState {
  key: string;
  filePath: string;
  focusNodeId: string | null;
  /** Display label for a focus tab (the focused node's name, captured by the caller — who
   * already has the DocNode in hand — at the time the tab was opened/retargeted). Stored
   * rather than looked up on render so the tab bar never has to walk a possibly huge tree
   * just to render a label; may go slightly stale if the node is renamed afterwards. */
  focusLabel: string | null;
  /** Ancestor ids of the focus node, root-first, captured when the focus was set/retargeted.
   * Used to find the nearest still-existing ancestor if the focused node gets deleted (the
   * live node is gone by then, so this snapshot is the only way back). Empty for a full-view
   * tab (whose "ancestor" is the document root itself, which can never be deleted). */
  focusAncestorIds: string[];
}

interface DocsState {
  docs: OpenDocumentState[]; // one per loaded document, deduped by filePath
  tabs: TabState[]; // one per visible tab, in display order
  activeKey: string | null;
}

/** Skeleton content for a brand-new document, keyed by format — see docs/entscheidungen.md
 * 2026-07-18 #3: XML starts with an empty <root></root>, JSON with an empty object. */
const NEW_DOCUMENT_SKELETON: Record<DocFormat, string> = {
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root></root>',
  json: "{}",
};

export function tabKey(filePath: string, focusNodeId: string | null): string {
  // "#" is safe here: node ids are always our own generated "n<number>" tokens (see
  // createNodeId in model/node.ts), which never contain it.
  return focusNodeId ? `${filePath}#${focusNodeId}` : filePath;
}

function nextUntitledPath(docs: OpenDocumentState[]): string {
  let max = 0;
  for (const d of docs) {
    const match = /^Unbenannt-(\d+)$/.exec(d.filePath);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Unbenannt-${max + 1}`;
}

function detectFormat(path: string, content: string): DocFormat {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xml")) return "xml";
  return content.trimStart().startsWith("<") ? "xml" : "json";
}

/**
 * Manages every currently open document and tab (the default multi-window mode, see
 * docs/entscheidungen.md #5). Documents are deduped by `filePath`; opening a path that's
 * already loaded just activates its full-view tab (creating it if it was closed while a
 * focus tab on the same document was still open) instead of re-parsing a duplicate.
 */
export function useJaxelDocuments(): {
  docs: OpenDocumentState[];
  tabs: TabState[];
  activeTab: TabState | null;
  activeDoc: OpenDocumentState | null;
  revision: number;
  openFile: (path: string) => Promise<void>;
  saveFile: (path?: string) => Promise<void>;
  /** Renames an untitled (or any) document's tab identity to a real, now-saved path —
   * updates every tab (full view + any foci) pointing at it. */
  saveFileAs: (currentPath: string, newPath: string) => Promise<void>;
  /** Creates a brand-new, unsaved document ("Unbenannt-N") and activates its full-view tab.
   * `content` overrides the default skeleton (e.g. a decoded Base64 payload) and must parse
   * in the given format — the caller handles parse errors. */
  newDocument: (format: DocFormat, content?: string) => void;
  /** Closes a single tab. The underlying document is only unloaded once no tab (full view
   * or focus) references it anymore. */
  closeTab: (key: string) => void;
  activate: (key: string) => void;
  /** Opens (or activates, if already open) a focused-view tab on an existing document.
   * `ancestorIds` is the focus node's ancestor chain (root-first) at open time. */
  openFocusTab: (filePath: string, nodeId: string, label: string, ancestorIds: string[]) => void;
  /** Re-targets an existing tab's focus node (breadcrumb navigation, or auto-refocus when
   * the focused node was deleted). `nodeId: null` means "focus on the real root" — if a
   * full-view tab for that document already exists, this tab merges into it instead of
   * creating a duplicate. */
  retargetFocusTab: (key: string, nodeId: string | null, label: string | null, ancestorIds: string[]) => void;
  /** Acknowledges an observed on-disk version without reloading or changing document content. */
  acknowledgeExternalChange: (filePath: string, mtimeMs: number, size: number) => void;
  /** Re-reads a document from disk after an external change; see the function itself. */
  reloadFile: (
    filePath: string,
    selectionSegments: PathSegment[] | null,
    expandedSegmentsList: PathSegment[][],
    /** Optional last-moment safety check, run synchronously after parsing and before replacing
     * the live document. Returning false leaves every store object untouched. */
    canCommit?: () => boolean,
  ) => Promise<{ selectedId: string | null; expandedIds: string[] } | null>;
} {
  const [state, setState] = useState<DocsState>({ docs: [], tabs: [], activeKey: null });
  const [revision, setRevision] = useState(0);
  /** Keyed by filePath (document-level), not by tab key — one CommandBus subscription per
   * loaded document, shared by every tab that points at it. */
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /** Re-derives `isDirty` for the document owning `commandBus` from its undo-stack baseline
   * (matched by object reference, not filePath, since a "save as" can rename the filePath out
   * from under the closure that created this subscription). Called on every do/undo/redo, so
   * undoing back down to exactly the saved depth clears `isDirty` again — see CONTEXT.md
   * "Baseline". */
  function syncDirty(commandBus: CommandBus): void {
    setState((prev) => ({
      ...prev,
      docs: prev.docs.map((d) => (d.commandBus === commandBus ? { ...d, isDirty: commandBus.isDirty() } : d)),
    }));
  }

  const openFile = useCallback(async (path: string) => {
    const result = await invoke<{ content: string; encoding: string; mtimeMs: number; size: number }>(
      "read_text_file",
      { path },
    );
    logInfo("breadcrumb", `Datei geöffnet: ${path}`);
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
    const unsubscribe = commandBus.subscribe(() => {
      setRevision((r) => r + 1);
      syncDirty(commandBus);
    });

    setState((prev) => {
      const key = tabKey(path, null);
      if (prev.docs.some((d) => d.filePath === path)) {
        unsubscribe(); // already loaded — discard this duplicate parse/subscription
        if (prev.tabs.some((t) => t.key === key)) return { ...prev, activeKey: key };
        return {
          ...prev,
          tabs: [...prev.tabs, { key, filePath: path, focusNodeId: null, focusLabel: null, focusAncestorIds: [] }],
          activeKey: key,
        };
      }
      unsubscribersRef.current.set(path, unsubscribe);
      const newDoc: OpenDocumentState = {
        filePath: path,
        format,
        document: doc,
        commandBus,
        sourceText: result.content,
        encoding: result.encoding,
        isDirty: false,
        changeBaseline: captureChangeBaseline(root),
        lastKnownMtimeMs: result.mtimeMs,
        lastKnownSize: result.size,
      };
      return {
        docs: [...prev.docs, newDoc],
        tabs: [...prev.tabs, { key, filePath: path, focusNodeId: null, focusLabel: null, focusAncestorIds: [] }],
        activeKey: key,
      };
    });
    setRevision((r) => r + 1);
  }, []);

  const saveFile = useCallback(async (path?: string) => {
    const targetPath = path ?? stateRef.current.tabs.find((t) => t.key === stateRef.current.activeKey)?.filePath;
    const target = stateRef.current.docs.find((d) => d.filePath === targetPath);
    if (!target) return;
    const text =
      target.format === "xml"
        ? serializeXmlMinimal(target.sourceText, {
            root: target.document.root,
            xmlDeclaration: target.document.xmlDeclaration,
            indent: target.document.indent,
          })
        : serializeJson({ root: target.document.root, indent: target.document.indent });
    const stat = await invoke<{ mtimeMs: number; size: number }>("write_text_file", {
      path: target.filePath,
      content: text,
      encoding: target.encoding,
    });
    logInfo("breadcrumb", `Datei gespeichert: ${target.filePath}`);
    // The file on disk now matches the tree again — that becomes the new minimal-invasive
    // baseline AND the new dirty/change-marker baseline (see CommandBus.markSaved,
    // CONTEXT.md "Baseline"). The tree's byteRanges must be refreshed to match this new
    // baseline text (not just the sourceText string swapped below) — otherwise the NEXT
    // save silently corrupts (docs/entscheidungen.md, "Byte-Offsets nach dem Speichern
    // auffrischen").
    if (target.format === "xml") {
      syncByteRangesAfterSave(target.document.root, parseXml(text).root);
    }
    target.commandBus.markSaved();
    const changeBaseline = captureChangeBaseline(target.document.root);
    setState((current) => ({
      ...current,
      docs: current.docs.map((d) =>
        d.filePath === target.filePath
          ? { ...d, sourceText: text, isDirty: false, changeBaseline, lastKnownMtimeMs: stat.mtimeMs, lastKnownSize: stat.size }
          : d,
      ),
    }));
  }, []);

  const saveFileAs = useCallback(async (currentPath: string, newPath: string) => {
    const target = stateRef.current.docs.find((d) => d.filePath === currentPath);
    if (!target) return;
    const text =
      target.format === "xml"
        ? serializeXmlMinimal(target.sourceText, {
            root: target.document.root,
            xmlDeclaration: target.document.xmlDeclaration,
            indent: target.document.indent,
          })
        : serializeJson({ root: target.document.root, indent: target.document.indent });
    const stat = await invoke<{ mtimeMs: number; size: number }>("write_text_file", {
      path: newPath,
      content: text,
      encoding: target.encoding,
    });
    logInfo("breadcrumb", `Datei gespeichert: ${newPath}`);
    if (target.format === "xml") {
      syncByteRangesAfterSave(target.document.root, parseXml(text).root);
    }
    target.commandBus.markSaved();
    const changeBaseline = captureChangeBaseline(target.document.root);
    const unsubscribe = unsubscribersRef.current.get(currentPath);
    if (unsubscribe) {
      unsubscribersRef.current.delete(currentPath);
      unsubscribersRef.current.set(newPath, unsubscribe);
    }
    setState((current) => {
      const keyRemap = new Map<string, string>();
      const tabs = current.tabs.map((t) => {
        if (t.filePath !== currentPath) return t;
        const newKey = tabKey(newPath, t.focusNodeId);
        keyRemap.set(t.key, newKey);
        return { ...t, filePath: newPath, key: newKey };
      });
      return {
        docs: current.docs.map((d) =>
          d.filePath === currentPath
            ? {
                ...d,
                filePath: newPath,
                isUntitled: false,
                sourceText: text,
                isDirty: false,
                changeBaseline,
                lastKnownMtimeMs: stat.mtimeMs,
                lastKnownSize: stat.size,
              }
            : d,
        ),
        tabs,
        activeKey: current.activeKey && keyRemap.has(current.activeKey) ? keyRemap.get(current.activeKey)! : current.activeKey,
      };
    });
  }, []);

  const newDocument = useCallback((format: DocFormat, content?: string) => {
    const skeletonText = content ?? NEW_DOCUMENT_SKELETON[format];
    let root: DocNode;
    let xmlDeclaration: string | undefined;
    if (format === "xml") {
      const parsed = parseXml(skeletonText);
      root = parsed.root;
      xmlDeclaration = parsed.xmlDeclaration;
    } else {
      root = parseJson(skeletonText).root;
    }

    const doc = createDocument({ format, root, encoding: "UTF-8", xmlDeclaration });
    const commandBus = new CommandBus(doc);
    const unsubscribe = commandBus.subscribe(() => {
      setRevision((r) => r + 1);
      syncDirty(commandBus);
    });

    setState((prev) => {
      const path = nextUntitledPath(prev.docs);
      unsubscribersRef.current.set(path, unsubscribe);
      const newDoc: OpenDocumentState = {
        filePath: path,
        format,
        document: doc,
        commandBus,
        sourceText: skeletonText,
        encoding: "UTF-8",
        isUntitled: true,
        isDirty: false,
        changeBaseline: captureChangeBaseline(root),
        lastKnownMtimeMs: 0,
        lastKnownSize: 0,
      };
      const key = tabKey(path, null);
      return {
        docs: [...prev.docs, newDoc],
        tabs: [...prev.tabs, { key, filePath: path, focusNodeId: null, focusLabel: null, focusAncestorIds: [] }],
        activeKey: key,
      };
    });
    setRevision((r) => r + 1);
  }, []);

  const closeTab = useCallback((key: string) => {
    setState((prev) => {
      const closingIndex = prev.tabs.findIndex((t) => t.key === key);
      if (closingIndex === -1) return prev;
      const closing = prev.tabs[closingIndex]!;
      const nextTabs = prev.tabs.filter((t) => t.key !== key);
      const stillReferenced = nextTabs.some((t) => t.filePath === closing.filePath);
      let nextDocs = prev.docs;
      if (!stillReferenced) {
        unsubscribersRef.current.get(closing.filePath)?.();
        unsubscribersRef.current.delete(closing.filePath);
        nextDocs = prev.docs.filter((d) => d.filePath !== closing.filePath);
      }
      let nextActive = prev.activeKey;
      if (prev.activeKey === key) {
        const neighbor = nextTabs[closingIndex] ?? nextTabs[closingIndex - 1] ?? null;
        nextActive = neighbor?.key ?? null;
      }
      return { docs: nextDocs, tabs: nextTabs, activeKey: nextActive };
    });
  }, []);

  const activate = useCallback((key: string) => {
    setState((prev) => (prev.tabs.some((t) => t.key === key) ? { ...prev, activeKey: key } : prev));
  }, []);

  const openFocusTab = useCallback((filePath: string, nodeId: string, label: string, ancestorIds: string[]) => {
    setState((prev) => {
      if (!prev.docs.some((d) => d.filePath === filePath)) return prev; // defensive: doc must already be loaded
      const key = tabKey(filePath, nodeId);
      if (prev.tabs.some((t) => t.key === key)) return { ...prev, activeKey: key };
      return {
        ...prev,
        tabs: [...prev.tabs, { key, filePath, focusNodeId: nodeId, focusLabel: label, focusAncestorIds: ancestorIds }],
        activeKey: key,
      };
    });
  }, []);

  const retargetFocusTab = useCallback((key: string, nodeId: string | null, label: string | null, ancestorIds: string[]) => {
    setState((prev) => {
      const tab = prev.tabs.find((t) => t.key === key);
      if (!tab) return prev;
      const newKey = tabKey(tab.filePath, nodeId);
      if (newKey === key) return prev;
      if (prev.tabs.some((t) => t.key === newKey)) {
        // A tab with that identity already exists (e.g. the full-view tab) — merge into it
        // instead of creating a duplicate; this tab simply closes.
        const tabs = prev.tabs.filter((t) => t.key !== key);
        return { ...prev, tabs, activeKey: prev.activeKey === key ? newKey : prev.activeKey };
      }
      const tabs = prev.tabs.map((t) =>
        t.key === key ? { ...t, key: newKey, focusNodeId: nodeId, focusLabel: label, focusAncestorIds: ancestorIds } : t,
      );
      return { ...prev, tabs, activeKey: prev.activeKey === key ? newKey : prev.activeKey };
    });
  }, []);

  /**
   * Re-reads `filePath` from disk after an external change (docs/entscheidungen.md 2026-07-18
   * #4) and rebuilds its document from scratch — undo history necessarily resets, since the
   * new tree has an entirely new set of node ids. `selectionSegments`/`expandedSegmentsList`
   * (captured by the CALLER against the OLD tree, via `getPathSegments`) are resolved against
   * the fresh tree and returned as ids, so App.tsx can restore the view as closely as
   * possible. Every tab pointing at this document (full view + any foci) is updated too: a
   * focus tab whose node no longer resolves falls back to the nearest still-resolvable
   * ancestor, exactly like the live-deletion case.
   */
  const acknowledgeExternalChange = useCallback((filePath: string, mtimeMs: number, size: number): void => {
    setState((prev) => ({
      ...prev,
      docs: prev.docs.map((doc) =>
        doc.filePath === filePath ? { ...doc, lastKnownMtimeMs: mtimeMs, lastKnownSize: size } : doc,
      ),
    }));
  }, []);

  const reloadFile = useCallback(
    async (
      filePath: string,
      selectionSegments: PathSegment[] | null,
      expandedSegmentsList: PathSegment[][],
      canCommit?: () => boolean,
    ): Promise<{ selectedId: string | null; expandedIds: string[] } | null> => {
      const target = stateRef.current.docs.find((d) => d.filePath === filePath);
      if (!target) return { selectedId: null, expandedIds: [] };

      const result = await invoke<{ content: string; encoding: string; mtimeMs: number; size: number }>(
        "read_text_file",
        { path: filePath },
      );
      let newRoot: DocNode;
      let xmlDeclaration: string | undefined;
      if (target.format === "xml") {
        const parsed = parseXml(result.content);
        newRoot = parsed.root;
        xmlDeclaration = parsed.xmlDeclaration;
      } else {
        newRoot = parseJson(result.content).root;
      }
      // No asynchronous boundary follows before the store replacement. This closes the window
      // in which an automatic reload could discard a command executed while read_text_file ran.
      if (canCommit && !canCommit()) return null;
      logInfo("breadcrumb", `Datei neu geladen: ${filePath}`);

      // Nearest-still-resolvable-ancestor fallback: try the full segment chain first, then
      // progressively shorter prefixes. A 1-element chain (the root's own segment) always
      // resolves (see resolveNodeBySegments), so this can never come up empty.
      function resolveDeepest(segments: PathSegment[]): DocNode {
        for (let cut = segments.length; cut >= 1; cut--) {
          const found = resolveNodeBySegments(newRoot, segments.slice(0, cut));
          if (found) return found;
        }
        return newRoot;
      }

      const resolvedSelectedId = selectionSegments ? resolveDeepest(selectionSegments).id : null;
      const resolvedExpandedIds = expandedSegmentsList.map((segments) => resolveDeepest(segments).id);

      const oldRoot = target.document.root;
      function remapTab(tab: TabState): TabState {
        if (!tab.focusNodeId) return tab; // full-view tab: no node reference to remap
        const oldNode = findNodeById(oldRoot, tab.focusNodeId);
        const segments = oldNode ? getPathSegments(oldNode, findAncestorChain(oldRoot, oldNode) ?? []) : null;
        const resolved = segments ? resolveDeepest(segments) : newRoot;
        const isTrueRoot = resolved === newRoot;
        return {
          key: tabKey(filePath, isTrueRoot ? null : resolved.id),
          filePath,
          focusNodeId: isTrueRoot ? null : resolved.id,
          focusLabel: isTrueRoot ? null : resolved.name,
          focusAncestorIds: isTrueRoot ? [] : (findAncestorChain(newRoot, resolved) ?? []).map((a) => a.id),
        };
      }

      const doc = createDocument({ format: target.format, root: newRoot, encoding: result.encoding, xmlDeclaration });
      const commandBus = new CommandBus(doc);
      const unsubscribe = commandBus.subscribe(() => {
        setRevision((r) => r + 1);
        syncDirty(commandBus);
      });
      unsubscribersRef.current.get(filePath)?.(); // drop the pre-reload subscription
      unsubscribersRef.current.set(filePath, unsubscribe);

      setState((prev) => {
        const docs = prev.docs.map((d) =>
          d.filePath === filePath
            ? {
                ...d,
                document: doc,
                commandBus,
                sourceText: result.content,
                encoding: result.encoding,
                isDirty: false,
                changeBaseline: captureChangeBaseline(newRoot),
                lastKnownMtimeMs: result.mtimeMs,
                lastKnownSize: result.size,
              }
            : d,
        );
        const remapped = prev.tabs.map((tab) => (tab.filePath === filePath ? remapTab(tab) : tab));
        // Two foci can fall back to the same ancestor (or to the full view) and collide —
        // keep the first, drop later duplicates, same rule as retargetFocusTab's merge.
        const seenKeys = new Set<string>();
        const tabs = remapped.filter((tab) => {
          if (tab.filePath !== filePath) return true;
          if (seenKeys.has(tab.key)) return false;
          seenKeys.add(tab.key);
          return true;
        });
        const activeKey = tabs.some((tab) => tab.key === prev.activeKey)
          ? prev.activeKey
          : (tabs.find((tab) => tab.filePath === filePath)?.key ?? prev.activeKey);
        return { docs, tabs, activeKey };
      });
      setRevision((r) => r + 1);

      return { selectedId: resolvedSelectedId, expandedIds: resolvedExpandedIds };
    },
    [],
  );

  const activeTab = state.tabs.find((t) => t.key === state.activeKey) ?? null;
  const activeDoc = activeTab ? (state.docs.find((d) => d.filePath === activeTab.filePath) ?? null) : null;

  return {
    docs: state.docs,
    tabs: state.tabs,
    activeTab,
    activeDoc,
    revision,
    openFile,
    saveFile,
    saveFileAs,
    newDocument,
    closeTab,
    activate,
    openFocusTab,
    retargetFocusTab,
    acknowledgeExternalChange,
    reloadFile,
  };
}
