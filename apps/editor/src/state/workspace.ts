import type { HostFileContent, HostFileStat, JaxelHost } from "../host.js";
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
  /** `commandBus.isDirty()` as of this snapshot (CONTEXT.md "Dirty"): derived by the workspace
   * on every command, never set independently. Drives the external-change conflict rule
   * (docs/entscheidungen.md 2026-07-18 #4): a reload may only happen automatically while this is
   * false — with unsaved changes, the dialog always asks. */
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

/** One immutable state of the workspace; a new object after every change. */
export interface WorkspaceSnapshot {
  docs: OpenDocumentState[]; // one per loaded document, deduped by filePath
  tabs: TabState[]; // one per visible tab, in display order
  activeKey: string | null;
  /** Bumped on every command and every document (re)load — invalidates tree-derived memos. */
  revision: number;
}

/** Selection and expansion re-found by path after a reload or conversion (all ids change). */
export interface ResolvedView {
  selectedId: string | null;
  expandedIds: string[];
}

/** What the workspace needs from its host: file I/O plus the log for breadcrumbs. Satisfied by
 * every `JaxelHost` (Tauri, VS Code) and by an in-memory host in tests. */
export type WorkspaceHost = Pick<JaxelHost, "readTextFile" | "writeTextFile" | "log">;

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

export function serializeForSave(target: OpenDocumentState): string {
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

/** The tab literal for a document's full view (no focus node). */
function fullViewTab(filePath: string): TabState {
  return { key: tabKey(filePath, null), filePath, focusNodeId: null, focusLabel: null, focusAncestorIds: [] };
}

/**
 * Every currently open document and tab (the default multi-window mode, see
 * docs/entscheidungen.md #5), React-free. Documents are deduped by `filePath`; opening a path
 * that's already loaded just activates its full-view tab (creating it if it was closed while a
 * focus tab on the same document was still open) instead of re-parsing a duplicate.
 *
 * State is exposed as immutable snapshots (`getSnapshot`/`subscribe`, the shape
 * `useSyncExternalStore` expects). All methods are bound arrow functions, so they stay stable
 * when destructured.
 */
export class Workspace {
  private snapshot: WorkspaceSnapshot = { docs: [], tabs: [], activeKey: null, revision: 0 };
  private readonly listeners = new Set<() => void>();
  /** One CommandBus subscription per loaded document, keyed by the document's CommandBus. */
  private readonly unsubscribers = new Map<CommandBus, () => void>();

  constructor(private readonly host: WorkspaceHost) {}

  getSnapshot = (): WorkspaceSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The tab currently shown, and the document behind it. */
  static active(snapshot: WorkspaceSnapshot): { tab: TabState | null; doc: OpenDocumentState | null } {
    const tab = snapshot.tabs.find((t) => t.key === snapshot.activeKey) ?? null;
    const doc = tab ? (snapshot.docs.find((d) => d.filePath === tab.filePath) ?? null) : null;
    return { tab, doc };
  }

  openFile = async (path: string): Promise<void> => {
    const result = await this.host.readTextFile(path);
    this.breadcrumb(`Datei geöffnet: ${path}`);
    const key = tabKey(path, null);
    const current = this.snapshot;
    if (current.docs.some((d) => d.filePath === path)) {
      // Already loaded: activate its full view (recreating the tab if only foci were left).
      const tabs = current.tabs.some((t) => t.key === key) ? current.tabs : [...current.tabs, fullViewTab(path)];
      this.update({ tabs, activeKey: key }, true);
      return;
    }
    const format = detectFormat(path, result.content);
    const doc: OpenDocumentState = {
      filePath: path,
      format,
      ...this.loadDocument(format, parseDocument(format, result.content), result.encoding, result.content, result),
    };
    this.update({ docs: [...current.docs, doc], tabs: [...current.tabs, fullViewTab(path)], activeKey: key }, true);
  };

  /** Saves `path` (default: the active tab's document) back to its own file. */
  saveFile = async (path?: string): Promise<void> => {
    const targetPath = path ?? Workspace.active(this.snapshot).tab?.filePath;
    const target = this.findDoc(targetPath);
    if (!target) return;
    const text = serializeForSave(target);
    const stat = await this.host.writeTextFile(target.filePath, text, target.encoding);
    this.breadcrumb(`Datei gespeichert: ${target.filePath}`);
    this.commitSaved(target, text, stat);
  };

  /** Writes a document to `newPath` and renames its tab identity there — every tab (full view +
   * any foci) pointing at it follows. */
  saveFileAs = async (currentPath: string, newPath: string): Promise<void> => {
    const target = this.findDoc(currentPath);
    if (!target) return;
    const text = serializeForSave(target);
    const stat = await this.host.writeTextFile(newPath, text, target.encoding);
    this.breadcrumb(`Datei gespeichert: ${newPath}`);
    this.commitSaved(target, text, stat);
    const current = this.snapshot;
    const keyRemap = new Map<string, string>();
    const tabs = current.tabs.map((t) => {
      if (t.filePath !== currentPath) return t;
      const newKey = tabKey(newPath, t.focusNodeId);
      keyRemap.set(t.key, newKey);
      return { ...t, filePath: newPath, key: newKey };
    });
    this.update({
      docs: current.docs.map((d) => (d.filePath === currentPath ? { ...d, filePath: newPath, isUntitled: false } : d)),
      tabs,
      activeKey: current.activeKey ? (keyRemap.get(current.activeKey) ?? current.activeKey) : null,
    });
  };

  /**
   * "Speichern unter" with the other format's extension: converts the tree, writes it, and
   * re-parses the result so the open tab really becomes a document of the new format — with a
   * tree built by the target format's own importer rather than by the converter, which keeps
   * `xml-import`/`json-import` the single authority on each format's tree shape. The undo
   * history necessarily resets (every node id changes); selection/expansion are re-resolved by
   * path, like a reload.
   *
   * Throws before writing anything if the tree has no representation in the target format
   * (`InvalidXmlNameError`), so a failed conversion never leaves a file behind.
   */
  convertSaveAs = async (
    currentPath: string,
    newPath: string,
    targetFormat: DocFormat,
    selectionSegments: PathSegment[] | null,
    expandedSegmentsList: PathSegment[][],
  ): Promise<ResolvedView> => {
    const target = this.findDoc(currentPath);
    if (!target) return { selectedId: null, expandedIds: [] };

    const text = convertDocument({
      to: targetFormat,
      root: target.document.root,
      indent: target.document.indent,
      encoding: target.encoding,
    });
    const stat = await this.host.writeTextFile(newPath, text, target.encoding);
    this.breadcrumb(`Datei konvertiert nach ${targetFormat} und gespeichert: ${newPath}`);

    return this.swapDocument({
      ...parseDocument(targetFormat, text),
      filePath: currentPath,
      newFilePath: newPath,
      newFormat: targetFormat,
      encoding: target.encoding,
      sourceText: text,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      selectionSegments,
      expandedSegmentsList,
    });
  };

  /** Creates a brand-new, unsaved document ("Unbenannt-N") and activates its full-view tab.
   * `content` overrides the default skeleton (e.g. a decoded Base64 payload) and must parse in
   * the given format — the caller handles parse errors. */
  newDocument = (format: DocFormat, content?: string): void => {
    const text = content ?? NEW_DOCUMENT_SKELETON[format];
    const parsed = parseDocument(format, text);
    const current = this.snapshot;
    const path = nextUntitledPath(current.docs);
    const doc: OpenDocumentState = {
      filePath: path,
      format,
      isUntitled: true,
      ...this.loadDocument(format, parsed, "UTF-8", text, { mtimeMs: 0, size: 0 }),
    };
    this.update(
      { docs: [...current.docs, doc], tabs: [...current.tabs, fullViewTab(path)], activeKey: tabKey(path, null) },
      true,
    );
  };

  /** Closes a single tab. The underlying document is only unloaded once no tab (full view or
   * focus) references it anymore. Closing the active tab activates its right neighbour, or the
   * left one when it was the last. */
  closeTab = (key: string): void => {
    const current = this.snapshot;
    const closingIndex = current.tabs.findIndex((t) => t.key === key);
    if (closingIndex === -1) return;
    const closing = current.tabs[closingIndex]!;
    const tabs = current.tabs.filter((t) => t.key !== key);
    let docs = current.docs;
    if (!tabs.some((t) => t.filePath === closing.filePath)) {
      const unloaded = this.findDoc(closing.filePath);
      if (unloaded) this.detach(unloaded.commandBus);
      docs = current.docs.filter((d) => d.filePath !== closing.filePath);
    }
    let activeKey = current.activeKey;
    if (current.activeKey === key) {
      const neighbor = tabs[closingIndex] ?? tabs[closingIndex - 1] ?? null;
      activeKey = neighbor?.key ?? null;
    }
    this.update({ docs, tabs, activeKey });
  };

  /**
   * What closing all of `keys` together would do: which documents it unloads (no tab would
   * reference them any more) and which of those have unsaved changes. Computed against the live
   * snapshot as ONE step, so a full view and a focus tab of the same document closing together
   * count as unloading it — the question a close prompt must ask before anything closes.
   */
  planClose = (keys: string[]): { unloads: OpenDocumentState[]; dirty: OpenDocumentState[] } => {
    const closing = new Set(keys);
    const remaining = this.snapshot.tabs.filter((t) => !closing.has(t.key));
    const unloads = this.snapshot.docs.filter(
      (d) =>
        this.snapshot.tabs.some((t) => closing.has(t.key) && t.filePath === d.filePath) &&
        !remaining.some((t) => t.filePath === d.filePath),
    );
    return { unloads, dirty: unloads.filter((d) => d.isDirty) };
  };

  /** Closes several tabs, one after another against the live state (see `closeTab`). */
  closeTabs = (keys: string[]): void => {
    for (const key of keys) this.closeTab(key);
  };

  reorderTabs = (key: string, targetIndex: number): void => {
    const current = this.snapshot;
    const sourceIndex = current.tabs.findIndex((tab) => tab.key === key);
    if (sourceIndex < 0) return;
    const boundedIndex = Math.max(0, Math.min(targetIndex, current.tabs.length - 1));
    if (sourceIndex === boundedIndex) return;
    const tabs = [...current.tabs];
    const [moved] = tabs.splice(sourceIndex, 1);
    tabs.splice(boundedIndex, 0, moved!);
    this.update({ tabs });
  };

  activate = (key: string): void => {
    if (this.snapshot.tabs.some((t) => t.key === key)) this.update({ activeKey: key });
  };

  /** Opens (or activates, if already open) a focused-view tab on an already loaded document.
   * `ancestorIds` is the focus node's ancestor chain (root-first) at open time. */
  openFocusTab = (filePath: string, nodeId: string, label: string, ancestorIds: string[]): void => {
    const current = this.snapshot;
    if (!this.findDoc(filePath)) return;
    const key = tabKey(filePath, nodeId);
    if (current.tabs.some((t) => t.key === key)) {
      this.update({ activeKey: key });
      return;
    }
    this.update({
      tabs: [...current.tabs, { key, filePath, focusNodeId: nodeId, focusLabel: label, focusAncestorIds: ancestorIds }],
      activeKey: key,
    });
  };

  /** Re-targets an existing tab's focus node (breadcrumb navigation, or auto-refocus when the
   * focused node was deleted). `nodeId: null` means "focus on the real root" — if a tab with
   * the new identity already exists (e.g. the full view), this tab merges into it instead of
   * creating a duplicate. */
  retargetFocusTab = (key: string, nodeId: string | null, label: string | null, ancestorIds: string[]): void => {
    const current = this.snapshot;
    const tab = current.tabs.find((t) => t.key === key);
    if (!tab) return;
    const newKey = tabKey(tab.filePath, nodeId);
    if (newKey === key) return;
    const activeKey = current.activeKey === key ? newKey : current.activeKey;
    if (current.tabs.some((t) => t.key === newKey)) {
      this.update({ tabs: current.tabs.filter((t) => t.key !== key), activeKey });
      return;
    }
    this.update({
      tabs: current.tabs.map((t) =>
        t.key === key ? { ...t, key: newKey, focusNodeId: nodeId, focusLabel: label, focusAncestorIds: ancestorIds } : t,
      ),
      activeKey,
    });
  };

  /** Acknowledges an observed on-disk version without reloading or changing document content. */
  acknowledgeExternalChange = (filePath: string, mtimeMs: number, size: number): void => {
    this.patchDoc(filePath, { lastKnownMtimeMs: mtimeMs, lastKnownSize: size });
  };

  /** Acknowledges a save the host performed (VS Code writes the file itself) and refreshes all
   * baselines used by the next edit/save — the same step as after our own save. */
  acknowledgeSaved = (filePath: string, text: string, stat?: HostFileStat): void => {
    const target = this.findDoc(filePath);
    if (target) this.commitSaved(target, text, stat);
  };

  /**
   * Re-reads `filePath` from disk after an external change (docs/entscheidungen.md 2026-07-18
   * #4) and rebuilds its document from scratch — undo history necessarily resets, since the new
   * tree has an entirely new set of node ids. `selectionSegments`/`expandedSegmentsList`
   * (captured by the CALLER against the OLD tree, via `pathSegmentsOf`) are resolved against
   * the fresh tree and returned as ids. Every tab pointing at this document is remapped too.
   *
   * `canCommit` is a last-moment safety check, run synchronously after parsing and before
   * replacing the live document. Returning false leaves the workspace untouched (result null).
   */
  reloadFile = async (
    filePath: string,
    selectionSegments: PathSegment[] | null,
    expandedSegmentsList: PathSegment[][],
    canCommit?: () => boolean,
  ): Promise<ResolvedView | null> => {
    const target = this.findDoc(filePath);
    if (!target) return { selectedId: null, expandedIds: [] };

    const result = await this.host.readTextFile(filePath);
    const parsed = parseDocument(target.format, result.content);
    // No asynchronous boundary follows before the replacement. This closes the window in which
    // an automatic reload could discard a command executed while read_text_file ran.
    if (canCommit && !canCommit()) return null;
    this.breadcrumb(`Datei neu geladen: ${filePath}`);

    return this.swapDocument({
      ...parsed,
      filePath,
      encoding: result.encoding,
      sourceText: result.content,
      mtimeMs: result.mtimeMs,
      size: result.size,
      selectionSegments,
      expandedSegmentsList,
    });
  };

  // ── internals ──────────────────────────────────────────────────────────────────────────

  private update(patch: Partial<Omit<WorkspaceSnapshot, "revision">>, bumpRevision = false): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      revision: bumpRevision ? this.snapshot.revision + 1 : this.snapshot.revision,
    };
    for (const listener of [...this.listeners]) listener();
  }

  private findDoc(filePath: string | undefined): OpenDocumentState | undefined {
    return this.snapshot.docs.find((d) => d.filePath === filePath);
  }

  private patchDoc(filePath: string, patch: Partial<OpenDocumentState>, bumpRevision = false): void {
    this.update(
      { docs: this.snapshot.docs.map((d) => (d.filePath === filePath ? { ...d, ...patch } : d)) },
      bumpRevision,
    );
  }

  private breadcrumb(message: string): void {
    // Fire-and-forget, like logging.ts: a failing log must never break a save or an open.
    void this.host.log("info", "breadcrumb", message).catch(() => {});
  }

  /**
   * The step after the file on disk matches the tree again, whoever wrote it: refresh the XML
   * byteRanges against the written text (otherwise the NEXT minimal-invasive save silently
   * corrupts — docs/entscheidungen.md "Byte-Offsets nach dem Speichern auffrischen"), move the
   * undo baseline (CommandBus.markSaved, CONTEXT.md "Baseline"), and recapture the change
   * markers' baseline. Kept in one place because two critical bugs already came from this
   * ordering breaking (also "Save-Epoche").
   */
  private commitSaved(target: OpenDocumentState, text: string, stat?: HostFileStat): void {
    if (target.format === "xml") {
      syncByteRangesAfterSave(target.document.root, parseXml(text).root);
    }
    target.commandBus.markSaved();
    this.patchDoc(target.filePath, {
      sourceText: text,
      isDirty: target.commandBus.isDirty(),
      changeBaseline: captureChangeBaseline(target.document.root),
      ...(stat ? { lastKnownMtimeMs: stat.mtimeMs, lastKnownSize: stat.size } : {}),
    });
  }

  /** Creates the JaxelDocument and its CommandBus for freshly parsed content and wires the bus
   * into the workspace (revision + dirty), shared by open, new, reload and convert. Identity
   * fields (`filePath`/`format`/`isUntitled`) stay with each caller. */
  private loadDocument(
    format: DocFormat,
    parsed: { root: DocNode } & XmlFraming,
    encoding: string,
    sourceText: string,
    stat: Pick<HostFileContent, "mtimeMs" | "size">,
  ): Omit<OpenDocumentState, "filePath" | "format" | "isUntitled"> {
    const document = createDocument({ ...parsed, format, encoding });
    const commandBus = new CommandBus(document);
    this.unsubscribers.set(
      commandBus,
      commandBus.subscribe(() => {
        // Matched by the bus, not by filePath: a "save as" renames the path under this closure.
        this.update(
          {
            docs: this.snapshot.docs.map((d) =>
              d.commandBus === commandBus ? { ...d, isDirty: commandBus.isDirty() } : d,
            ),
          },
          true,
        );
      }),
    );
    return {
      document,
      commandBus,
      sourceText,
      encoding,
      isDirty: false,
      changeBaseline: captureChangeBaseline(parsed.root),
      lastKnownMtimeMs: stat.mtimeMs,
      lastKnownSize: stat.size,
    };
  }

  private detach(commandBus: CommandBus): void {
    this.unsubscribers.get(commandBus)?.();
    this.unsubscribers.delete(commandBus);
  }

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
  private swapDocument(
    params: {
      filePath: string;
      newFilePath?: string;
      newFormat?: DocFormat;
      root: DocNode;
      encoding: string;
      sourceText: string;
      mtimeMs: number;
      size: number;
      selectionSegments: PathSegment[] | null;
      expandedSegmentsList: PathSegment[][];
    } & XmlFraming,
  ): ResolvedView {
    const { filePath, root: newRoot } = params;
    const newPath = params.newFilePath ?? filePath;
    const target = this.findDoc(filePath);
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

    const view: ResolvedView = {
      selectedId: params.selectionSegments ? resolveDeepest(params.selectionSegments).id : null,
      expandedIds: params.expandedSegmentsList.map((segments) => resolveDeepest(segments).id),
    };

    const format = params.newFormat ?? target?.format ?? "xml";
    const loaded = this.loadDocument(format, params, params.encoding, params.sourceText, params);
    if (target) this.detach(target.commandBus); // drop the pre-swap subscription

    const current = this.snapshot;
    const docs = current.docs.map((d) =>
      d.filePath === filePath
        ? { ...d, ...loaded, filePath: newPath, ...(params.newFormat ? { format: params.newFormat, isUntitled: false } : {}) }
        : d,
    );
    const keyRemap = new Map<string, string>();
    const remapped = current.tabs.map((tab) => {
      if (tab.filePath !== filePath) return tab;
      const next = remapTab(tab);
      keyRemap.set(tab.key, next.key);
      return next;
    });
    // Two foci can fall back to the same ancestor (or to the full view) and collide — keep the
    // first, drop later duplicates, same rule as retargetFocusTab's merge.
    const seenKeys = new Set<string>();
    const tabs = remapped.filter((tab) => {
      if (tab.filePath !== newPath) return true;
      if (seenKeys.has(tab.key)) return false;
      seenKeys.add(tab.key);
      return true;
    });
    const mappedActive = current.activeKey ? (keyRemap.get(current.activeKey) ?? current.activeKey) : null;
    const activeKey = tabs.some((tab) => tab.key === mappedActive)
      ? mappedActive
      : (tabs.find((tab) => tab.filePath === newPath)?.key ?? current.activeKey);
    this.update({ docs, tabs, activeKey }, true);

    return view;
  }
}
