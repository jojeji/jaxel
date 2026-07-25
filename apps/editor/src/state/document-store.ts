import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logInfo } from "../logging.js";
import {
  CommandBus,
  captureChangeBaseline,
  convertDocument,
  createDocument,
  findAncestorChain,
  findNodeById,
  parseDocument,
  parseXml,
  pathSegmentsOf,
  resolveNodeBySegments,
  serializeJson,
  serializeXmlMinimal,
  syncByteRangesAfterSave,
  type ChangeBaseline,
  type DocFormat,
  type DocNode,
  type JaxelDocument,
  type PathSegment,
  type XmlFraming,
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
  // The trailing newline is load-bearing: it becomes the document's `epilog` (see XmlFraming),
  // and saving now reproduces that span verbatim instead of always appending one.
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root></root>\n',
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

/** The format a path's extension asks for, or null for anything else (".txt", no extension).
 * Also what "Speichern unter" reads to decide whether the user is asking for a conversion. */
export function formatOfExtension(path: string): DocFormat | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xml")) return "xml";
  return null;
}

function detectFormat(path: string, content: string): DocFormat {
  return formatOfExtension(path) ?? (content.trimStart().startsWith("<") ? "xml" : "json");
}

function serializeForSave(target: OpenDocumentState): string {
  return target.format === "xml"
    ? serializeXmlMinimal(target.sourceText, {
        root: target.document.root,
        indent: target.document.indent,
        xmlDeclaration: target.document.xmlDeclaration,
        prolog: target.document.prolog,
        epilog: target.document.epilog,
      })
    : serializeJson({ root: target.document.root, indent: target.document.indent });
}

/**
 * The write→refresh→baseline sequence shared by `saveFile`/`saveFileAs` — centralized because
 * two critical bugs already came from this exact ordering breaking (docs/entscheidungen.md
 * "Byte-Offsets nach dem Speichern auffrischen" and "Save-Epoche"). Only the state-update
 * shape differs between the two callers (simple field patch vs. path rename + tab remap),
 * which stays with them.
 */
async function persistSaved(
  target: OpenDocumentState,
  writePath: string,
): Promise<{ text: string; stat: { mtimeMs: number; size: number }; changeBaseline: ChangeBaseline }> {
  const text = serializeForSave(target);
  const stat = await invoke<{ mtimeMs: number; size: number }>("write_text_file", {
    path: writePath,
    content: text,
    encoding: target.encoding,
  });
  logInfo("breadcrumb", `Datei gespeichert: ${writePath}`);
  // The file on disk now matches the tree again — that becomes the new minimal-invasive
  // baseline AND the new dirty/change-marker baseline (see CommandBus.markSaved, CONTEXT.md
  // "Baseline"). The tree's byteRanges must be refreshed to match this new baseline text —
  // otherwise the NEXT save silently corrupts (docs/entscheidungen.md, "Byte-Offsets nach dem
  // Speichern auffrischen").
  if (target.format === "xml") {
    syncByteRangesAfterSave(target.document.root, parseXml(text).root);
  }
  target.commandBus.markSaved();
  const changeBaseline = captureChangeBaseline(target.document.root);
  return { text, stat, changeBaseline };
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
  /** "Speichern unter" into the OTHER format: converts, writes, and turns the open document
   * into one of `targetFormat`. The undo history necessarily resets (every node id changes);
   * selection/expansion are re-resolved by path, like a reload. */
  convertSaveAs: (
    currentPath: string,
    newPath: string,
    targetFormat: DocFormat,
    selectionSegments: PathSegment[] | null,
    expandedSegmentsList: PathSegment[][],
  ) => Promise<{ selectedId: string | null; expandedIds: string[] }>;
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

  /** Wires a freshly created `JaxelDocument` into the store's revision/dirty tracking —
   * shared by every place a document is (re)created (open, new, reload) so this bootstrap
   * can't drift or get forgotten at a future call site. */
  function attachDocument(doc: JaxelDocument): { commandBus: CommandBus; unsubscribe: () => void } {
    const commandBus = new CommandBus(doc);
    const unsubscribe = commandBus.subscribe(() => {
      setRevision((r) => r + 1);
      syncDirty(commandBus);
    });
    return { commandBus, unsubscribe };
  }

  /**
   * Builds the fields shared by every document (re)creation path — open, new, reload:
   * wires the document into the store via `attachDocument`, and computes the change-diff
   * baseline and file-identity snapshot from the same `root`/stat. Identity fields
   * (`filePath`/`format`/`isUntitled`) deliberately stay with each caller — `reloadFile` keeps
   * the document's EXISTING ones instead of replacing them, so folding those in here would
   * force it to pass back values it never actually wants to change.
   */
  function createDocumentCore(
    params: {
      format: DocFormat;
      root: DocNode;
      encoding: string;
      sourceText: string;
      mtimeMs: number;
      size: number;
    } & XmlFraming,
  ): {
    core: Pick<
      OpenDocumentState,
      "document" | "commandBus" | "sourceText" | "encoding" | "isDirty" | "changeBaseline" | "lastKnownMtimeMs" | "lastKnownSize"
    >;
    unsubscribe: () => void;
  } {
    const doc = createDocument({
      format: params.format,
      root: params.root,
      encoding: params.encoding,
      xmlDeclaration: params.xmlDeclaration,
      prolog: params.prolog,
      epilog: params.epilog,
    });
    const { commandBus, unsubscribe } = attachDocument(doc);
    return {
      core: {
        document: doc,
        commandBus,
        sourceText: params.sourceText,
        encoding: params.encoding,
        isDirty: false,
        changeBaseline: captureChangeBaseline(params.root),
        lastKnownMtimeMs: params.mtimeMs,
        lastKnownSize: params.size,
      },
      unsubscribe,
    };
  }

  /** The tab literal for a document's full view (no focus node) — shared by every place a
   * document is (re)created. */
  function makeFullViewTab(filePath: string): TabState {
    return { key: tabKey(filePath, null), filePath, focusNodeId: null, focusLabel: null, focusAncestorIds: [] };
  }

  const openFile = useCallback(async (path: string) => {
    const result = await invoke<{ content: string; encoding: string; mtimeMs: number; size: number }>(
      "read_text_file",
      { path },
    );
    logInfo("breadcrumb", `Datei geöffnet: ${path}`);
    const format = detectFormat(path, result.content);
    const parsed = parseDocument(format, result.content);

    const { core, unsubscribe } = createDocumentCore({
      ...parsed,
      format,
      encoding: result.encoding,
      sourceText: result.content,
      mtimeMs: result.mtimeMs,
      size: result.size,
    });

    setState((prev) => {
      const key = tabKey(path, null);
      if (prev.docs.some((d) => d.filePath === path)) {
        unsubscribe(); // already loaded — discard this duplicate parse/subscription
        if (prev.tabs.some((t) => t.key === key)) return { ...prev, activeKey: key };
        return { ...prev, tabs: [...prev.tabs, makeFullViewTab(path)], activeKey: key };
      }
      unsubscribersRef.current.set(path, unsubscribe);
      const newDoc: OpenDocumentState = { filePath: path, format, ...core };
      return { docs: [...prev.docs, newDoc], tabs: [...prev.tabs, makeFullViewTab(path)], activeKey: key };
    });
    setRevision((r) => r + 1);
  }, []);

  const saveFile = useCallback(async (path?: string) => {
    const targetPath = path ?? stateRef.current.tabs.find((t) => t.key === stateRef.current.activeKey)?.filePath;
    const target = stateRef.current.docs.find((d) => d.filePath === targetPath);
    if (!target) return;
    const { text, stat, changeBaseline } = await persistSaved(target, target.filePath);
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
    const { text, stat, changeBaseline } = await persistSaved(target, newPath);
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
    const parsed = parseDocument(format, skeletonText);

    const { core, unsubscribe } = createDocumentCore({
      ...parsed,
      format,
      encoding: "UTF-8",
      sourceText: skeletonText,
      mtimeMs: 0,
      size: 0,
    });

    setState((prev) => {
      const path = nextUntitledPath(prev.docs);
      unsubscribersRef.current.set(path, unsubscribe);
      const newDoc: OpenDocumentState = { filePath: path, format, isUntitled: true, ...core };
      return { docs: [...prev.docs, newDoc], tabs: [...prev.tabs, makeFullViewTab(path)], activeKey: tabKey(path, null) };
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
   * (captured by the CALLER against the OLD tree, via `pathSegmentsOf`) are resolved against
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

  /**
   * Replaces a loaded document's tree wholesale and re-resolves everything that pointed into
   * the old one. Shared by "reload from disk" and "convert to the other format" because both
   * throw away every node id: both need a fresh CommandBus (an undo stack captured against
   * dead nodes cannot survive), and both must re-find the caller's selection/expansion and
   * every focus tab's node by PATH instead of by id.
   *
   * `newFilePath`/`newFormat` are the conversion's extra move — it also changes the document's
   * identity and format, which a reload never does.
   */
  function swapDocument(
    params: {
      filePath: string;
      newFilePath?: string;
      newFormat?: DocFormat;
      newRoot: DocNode;
      encoding: string;
      sourceText: string;
      mtimeMs: number;
      size: number;
      selectionSegments: PathSegment[] | null;
      expandedSegmentsList: PathSegment[][];
    } & XmlFraming,
  ): { selectedId: string | null; expandedIds: string[] } {
    const { filePath, newRoot } = params;
    const newPath = params.newFilePath ?? filePath;
    const target = stateRef.current.docs.find((d) => d.filePath === filePath);
    const oldRoot = target?.document.root ?? newRoot;

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

    function remapTab(tab: TabState): TabState {
      if (!tab.focusNodeId) return { ...tab, key: tabKey(newPath, null), filePath: newPath };
      const oldNode = findNodeById(oldRoot, tab.focusNodeId);
      const segments = oldNode ? pathSegmentsOf(oldRoot, oldNode) : null;
      const resolved = segments ? resolveDeepest(segments) : newRoot;
      const isTrueRoot = resolved === newRoot;
      return {
        key: tabKey(newPath, isTrueRoot ? null : resolved.id),
        filePath: newPath,
        focusNodeId: isTrueRoot ? null : resolved.id,
        focusLabel: isTrueRoot ? null : resolved.name,
        focusAncestorIds: isTrueRoot ? [] : (findAncestorChain(newRoot, resolved) ?? []).map((a) => a.id),
      };
    }

    const resolvedSelectedId = params.selectionSegments ? resolveDeepest(params.selectionSegments).id : null;
    const resolvedExpandedIds = params.expandedSegmentsList.map((segments) => resolveDeepest(segments).id);

    const { core, unsubscribe } = createDocumentCore({
      format: params.newFormat ?? target?.format ?? "xml",
      root: newRoot,
      xmlDeclaration: params.xmlDeclaration,
      prolog: params.prolog,
      epilog: params.epilog,
      encoding: params.encoding,
      sourceText: params.sourceText,
      mtimeMs: params.mtimeMs,
      size: params.size,
    });
    unsubscribersRef.current.get(filePath)?.(); // drop the pre-swap subscription
    unsubscribersRef.current.delete(filePath);
    unsubscribersRef.current.set(newPath, unsubscribe);

    setState((prev) => {
      const keyRemap = new Map<string, string>();
      const docs = prev.docs.map((d) =>
        d.filePath === filePath
          ? {
              ...d,
              ...core,
              filePath: newPath,
              ...(params.newFormat ? { format: params.newFormat, isUntitled: false } : {}),
            }
          : d,
      );
      const remapped = prev.tabs.map((tab) => {
        if (tab.filePath !== filePath) return tab;
        const next = remapTab(tab);
        keyRemap.set(tab.key, next.key);
        return next;
      });
      // Two foci can fall back to the same ancestor (or to the full view) and collide —
      // keep the first, drop later duplicates, same rule as retargetFocusTab's merge.
      const seenKeys = new Set<string>();
      const tabs = remapped.filter((tab) => {
        if (tab.filePath !== newPath) return true;
        if (seenKeys.has(tab.key)) return false;
        seenKeys.add(tab.key);
        return true;
      });
      const mappedActive = prev.activeKey ? (keyRemap.get(prev.activeKey) ?? prev.activeKey) : null;
      const activeKey = tabs.some((tab) => tab.key === mappedActive)
        ? mappedActive
        : (tabs.find((tab) => tab.filePath === newPath)?.key ?? prev.activeKey);
      return { docs, tabs, activeKey };
    });
    setRevision((r) => r + 1);

    return { selectedId: resolvedSelectedId, expandedIds: resolvedExpandedIds };
  }

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
      const parsed = parseDocument(target.format, result.content);
      // No asynchronous boundary follows before the store replacement. This closes the window
      // in which an automatic reload could discard a command executed while read_text_file ran.
      if (canCommit && !canCommit()) return null;
      logInfo("breadcrumb", `Datei neu geladen: ${filePath}`);

      return swapDocument({
        ...parsed,
        filePath,
        newRoot: parsed.root,
        encoding: result.encoding,
        sourceText: result.content,
        mtimeMs: result.mtimeMs,
        size: result.size,
        selectionSegments,
        expandedSegmentsList,
      });
    },
    [],
  );

  /**
   * "Speichern unter" with the other format's extension: converts the tree, writes it, and
   * re-parses the result so the open tab really becomes a document of the new format — with a
   * tree built by the target format's own importer rather than by the converter, which keeps
   * `xml-import`/`json-import` the single authority on each format's tree shape.
   *
   * Throws before writing anything if the tree has no representation in the target format
   * (`InvalidXmlNameError`), so a failed conversion never leaves a file behind.
   */
  const convertSaveAs = useCallback(
    async (
      currentPath: string,
      newPath: string,
      targetFormat: DocFormat,
      selectionSegments: PathSegment[] | null,
      expandedSegmentsList: PathSegment[][],
    ): Promise<{ selectedId: string | null; expandedIds: string[] }> => {
      const target = stateRef.current.docs.find((d) => d.filePath === currentPath);
      if (!target) return { selectedId: null, expandedIds: [] };

      const text = convertDocument({
        to: targetFormat,
        root: target.document.root,
        indent: target.document.indent,
        encoding: target.encoding,
      });
      const stat = await invoke<{ mtimeMs: number; size: number }>("write_text_file", {
        path: newPath,
        content: text,
        encoding: target.encoding,
      });
      logInfo("breadcrumb", `Datei konvertiert nach ${targetFormat} und gespeichert: ${newPath}`);

      const parsed = parseDocument(targetFormat, text);
      return swapDocument({
        ...parsed,
        filePath: currentPath,
        newFilePath: newPath,
        newFormat: targetFormat,
        newRoot: parsed.root,
        encoding: target.encoding,
        sourceText: text,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        selectionSegments,
        expandedSegmentsList,
      });
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
    convertSaveAs,
    newDocument,
    closeTab,
    activate,
    openFocusTab,
    retargetFocusTab,
    acknowledgeExternalChange,
    reloadFile,
  };
}
