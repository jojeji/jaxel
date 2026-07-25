import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { looksLikeBase64, type ChangeSet, type DropPosition, type Tombstone } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";
import { withTombstones, type DisplayRow, type TreeRow } from "./flatten.js";
import { computeDropAllowed, positionFromRatio } from "./dnd.js";
import { computeAnchoredScrollTop, computeRevealScrollTop } from "./scroll-math.js";
import { selectModifierOf, type SelectModifier } from "./selection.js";

const ROW_HEIGHT = 22;
const OVERSCAN = 8;

export type { DropPosition };
export type EditingField = { nodeId: string; field: "name" | "value" };

interface DropTarget {
  rowId: string;
  position: DropPosition;
}

/** Ghost opacity while dragging a row — the native browser/WebKitGTK drag image is often
 * near-opaque, which hides the insert-line/drop-target highlight underneath the cursor. */
const DRAG_GHOST_OPACITY = "0.5";

/**
 * Replaces the native (often opaque) drag ghost with a translucent clone of the row, so the
 * drop indicator underneath the cursor stays visible while dragging. No-op in environments
 * without `setDragImage` (e.g. jsdom in tests).
 */
function setDragGhost(event: React.DragEvent): void {
  if (typeof event.dataTransfer.setDragImage !== "function") return;
  const original = event.currentTarget as HTMLElement;
  const rect = original.getBoundingClientRect();
  const clone = original.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.opacity = DRAG_GHOST_OPACITY;
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);
  event.dataTransfer.setDragImage(clone, event.clientX - rect.left, event.clientY - rect.top);
  window.setTimeout(() => document.body.removeChild(clone), 0);
}

interface TreeViewProps {
  /**
   * Already-flattened visible rows. Expanded/collapsed state (and filter mode) live in
   * App, which computes this list — TreeView only virtualizes and renders it.
   */
  rows: TreeRow[];
  expanded: ReadonlySet<string>;
  /** Every selected node's id — a single selection is just the one-element case. */
  selectedIds: ReadonlySet<string>;
  onToggle: (row: TreeRow) => void;
  /** `modifier` carries the click's Ctrl/Shift gesture; App owns what each one means. */
  onSelect: (row: TreeRow, modifier: SelectModifier) => void;
  editingField: EditingField | null;
  onStartEditName: (row: TreeRow) => void;
  onStartEditValue: (row: TreeRow) => void;
  onCommitEdit: (row: TreeRow, field: "name" | "value", newText: string) => void;
  onCancelEdit: () => void;
  /** Right-click on a row. App decides what it does to the selection (keep a multi-selection
   * the row belongs to, otherwise collapse onto this row) — TreeView does not preselect. */
  onRowContextMenu: (row: TreeRow, x: number, y: number) => void;
  /** Drag&drop move; validity (own subtree etc.) is pre-checked here in TreeView. */
  onMoveNode: (source: TreeRow, target: TreeRow, position: DropPosition) => void;
  /** Click on the "base64" badge of a row whose value looks like base64 content. The
   * heuristic runs only for the rows actually rendered (virtualization), so huge documents
   * pay nothing for it. */
  onDecodeBase64: (row: TreeRow) => void;
  /**
   * When set (e.g. by "next search match" or keyboard navigation), scrolls this node's
   * row into view. Expanding its ancestors is App's job (it owns the expanded set).
   */
  revealNodeId?: string | null;
  /** Optional change markers/tombstones (Settings: "Baum" toggle, default off) — see
   * @jaxel/core computeChanges, CONTEXT.md "Änderungsmarker"/"Tombstone". `null` renders the
   * plain tree with no markers at all (the common case). */
  changes?: ChangeSet | null;
}

/**
 * Virtualized tree: only rows within the scrolled viewport (plus a small overscan) are
 * mounted, so this stays responsive for documents with tens/hundreds of thousands of nodes.
 */
export function TreeView({
  rows,
  expanded,
  selectedIds,
  onToggle,
  onSelect,
  editingField,
  onStartEditName,
  onStartEditValue,
  onCommitEdit,
  onCancelEdit,
  onRowContextMenu,
  onMoveNode,
  onDecodeBase64,
  revealNodeId,
  changes = null,
}: TreeViewProps): React.ReactElement {
  const displayRows = useMemo(() => withTombstones(rows, changes), [rows, changes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  /** Set right before a toggle changes `rows`' length (expand/collapse adds/removes rows
   * below the toggled node) — the layout effect below then re-anchors scroll so the toggled
   * row stays at the same viewport pixel it was at, instead of drifting when the browser
   * clamps scrollTop to the new (shorter/taller) content height. */
  const scrollAnchorRef = useRef<{ nodeId: string; offsetInViewport: number } | null>(null);
  /** Which `revealNodeId` the effect below has already scrolled to (or confirmed already
   * visible) — without this, the effect's `rows` dependency (needed so it can retry once an
   * ancestor finishes expanding, see below) would also make it re-fire and yank the scroll
   * back to a long-stale revealNodeId on ANY later, unrelated tree change (e.g. collapsing a
   * distant node), not just when a new reveal is actually requested. */
  const handledRevealNodeIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    scrollAnchorRef.current = null;
    const newIndex = displayRows.findIndex((item) => item.kind === "node" && item.row.node.id === anchor.nodeId);
    if (newIndex === -1) return; // toggled row itself no longer visible (e.g. an ancestor collapsed too)
    const newScrollTop = computeAnchoredScrollTop(newIndex, anchor.offsetInViewport, ROW_HEIGHT);
    if (containerRef.current) containerRef.current.scrollTop = newScrollTop;
    setScrollTop(newScrollTop);
  }, [displayRows]);

  useEffect(() => {
    if (!revealNodeId) return;
    if (revealNodeId === handledRevealNodeIdRef.current) return; // already satisfied this reveal request
    const index = displayRows.findIndex((item) => item.kind === "node" && item.row.node.id === revealNodeId);
    if (index === -1) return; // ancestors not expanded yet in this pass; the next effect run will catch it
    handledRevealNodeIdRef.current = revealNodeId; // don't re-center again on later, unrelated rows changes
    setScrollTop((current) => {
      const next = computeRevealScrollTop(index, ROW_HEIGHT, current, viewportHeight);
      if (next !== current && containerRef.current) containerRef.current.scrollTop = next;
      return next;
    });
  }, [revealNodeId, displayRows, viewportHeight]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(displayRows.length, startIndex + visibleCount);
  const visibleRows = displayRows.slice(startIndex, endIndex);

  const dragRow = dragRowId ? (rows.find((row) => row.node.id === dragRowId) ?? null) : null;

  function dropAllowed(target: TreeRow, position: DropPosition): boolean {
    return dragRow !== null && computeDropAllowed(dragRow.node, target, position);
  }

  function handleDragOver(row: TreeRow, event: React.DragEvent): void {
    if (!dragRow) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
    const position: DropPosition = positionFromRatio(ratio);
    if (!dropAllowed(row, position)) {
      setDropTarget(null);
      return;
    }
    event.preventDefault(); // allows the drop
    event.dataTransfer.dropEffect = "move";
    setDropTarget((current) =>
      current?.rowId === row.node.id && current.position === position
        ? current
        : { rowId: row.node.id, position },
    );
  }

  function handleDrop(row: TreeRow, event: React.DragEvent): void {
    event.preventDefault();
    const source = dragRow;
    const target = dropTarget;
    setDragRowId(null);
    setDropTarget(null);
    if (!source || !target || target.rowId !== row.node.id) return;
    if (!dropAllowed(row, target.position)) return;
    onMoveNode(source, row, target.position);
  }

  return (
    <div
      ref={containerRef}
      className="tree-view"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="tree-view__spacer" style={{ height: displayRows.length * ROW_HEIGHT }}>
        {visibleRows.map((item, i) => {
          const top = (startIndex + i) * ROW_HEIGHT;
          if (item.kind === "tombstone") {
            return (
              <TombstoneRowView
                key={`tombstone-${item.tombstone.id}`}
                tombstone={item.tombstone}
                depth={item.depth}
                top={top}
              />
            );
          }
          const row = item.row;
          function handleToggle(): void {
            scrollAnchorRef.current = { nodeId: row.node.id, offsetInViewport: top - scrollTop };
            onToggle(row);
          }
          return (
            <TreeRowView
              key={row.node.id}
              row={row}
              top={top}
              expanded={expanded.has(row.node.id)}
              selected={selectedIds.has(row.node.id)}
              editingField={editingField?.nodeId === row.node.id ? editingField.field : null}
              dropPosition={dropTarget?.rowId === row.node.id ? dropTarget.position : null}
              changeMarker={
                changes?.added.has(row.node.id)
                  ? "added"
                  : changes?.modified.has(row.node.id)
                    ? "modified"
                    : changes?.containsChange.has(row.node.id)
                      ? "contains"
                      : null
              }
              onToggle={handleToggle}
              onSelect={(modifier) => onSelect(row, modifier)}
              onStartEditName={() => onStartEditName(row)}
              onStartEditValue={() => onStartEditValue(row)}
              onCommitEdit={(field, text) => onCommitEdit(row, field, text)}
              onCancelEdit={onCancelEdit}
              onContextMenu={(x, y) => onRowContextMenu(row, x, y)}
              onDecodeBase64={() => onDecodeBase64(row)}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", row.node.name);
                event.dataTransfer.effectAllowed = "move";
                setDragRowId(row.node.id);
                setDragGhost(event);
              }}
              onDragOver={(event) => handleDragOver(row, event)}
              onDrop={(event) => handleDrop(row, event)}
              onDragEnd={() => {
                setDragRowId(null);
                setDropTarget(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Which change-marker dot (if any) a row should show — see CONTEXT.md "Änderungsmarker".
 * `null` when change markers are off (`changes` prop not passed) or this row is unchanged. */
type ChangeMarker = "added" | "modified" | "contains" | null;

interface TreeRowViewProps {
  row: TreeRow;
  top: number;
  expanded: boolean;
  selected: boolean;
  editingField: "name" | "value" | null;
  dropPosition: DropPosition | null;
  changeMarker: ChangeMarker;
  onToggle: () => void;
  onSelect: (modifier: SelectModifier) => void;
  onStartEditName: () => void;
  onStartEditValue: () => void;
  onCommitEdit: (field: "name" | "value", newText: string) => void;
  onCancelEdit: () => void;
  onContextMenu: (x: number, y: number) => void;
  onDecodeBase64: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}

function TreeRowView({
  row,
  top,
  expanded,
  selected,
  editingField,
  dropPosition,
  changeMarker,
  onToggle,
  onSelect,
  onStartEditName,
  onStartEditValue,
  onCommitEdit,
  onCancelEdit,
  onContextMenu,
  onDecodeBase64,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TreeRowViewProps): React.ReactElement {
  const { t } = useI18n();
  const { node, depth, hasChildren } = row;
  const isCommentRow = node.kind === "comment";
  // Rows sitting INSIDE a commented-out subtree — they carry the same muted styling and the
  // left rail that shows how far the stilllegung reaches (CONTEXT.md, "Auskommentierter Teilbaum").
  const insideComment = row.ancestors.some((ancestor) => ancestor.kind === "comment");
  // A commented-out subtree shows its markup, not a child count: the count would describe the
  // parsed view, which is not what the file contains.
  const preview = isCommentRow
    ? (node.value ?? "").trim()
    : hasChildren
      ? `(${node.children.length})`
      : (node.value ?? "");
  const dropClass =
    dropPosition === "into"
      ? " tree-row--drop-into"
      : dropPosition === "before"
        ? " tree-row--drop-before"
        : dropPosition === "after"
          ? " tree-row--drop-after"
          : "";

  // Single click selects AND toggles (double-click fires two clicks first, so a toggle
  // pair cancels itself out before the name/value editor opens — net-neutral by design).
  // A Ctrl/Shift click is a pure selection gesture: toggling expand/collapse while picking
  // several rows would reshuffle the very list the user is clicking through.
  function handleRowClick(event: React.MouseEvent): void {
    const modifier = selectModifierOf(event);
    onSelect(modifier);
    if (hasChildren && modifier === "none") onToggle();
  }

  return (
    <div
      className={`tree-row${selected ? " tree-row--selected" : ""}${
        isCommentRow ? " tree-row--comment" : ""
      }${insideComment ? " tree-row--in-comment" : ""}${dropClass}`}
      style={{ top, height: ROW_HEIGHT, paddingLeft: depth * 16, "--indent": `${depth * 16}px` } as React.CSSProperties}
      onClick={handleRowClick}
      onContextMenu={(event) => {
        event.preventDefault();
        // No onSelect here: App decides whether this right-click keeps an existing
        // multi-selection or collapses onto this row (see onRowContextMenu).
        onContextMenu(event.clientX, event.clientY);
      }}
      draggable={row.ancestors.length > 0 && editingField === null}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span
        className="tree-row__twisty"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(selectModifierOf(event));
          onToggle();
        }}
      >
        {hasChildren ? (expanded ? "▾" : "▸") : ""}
      </span>

      {changeMarker && (
        <span
          className={`tree-row__change-marker tree-row__change-marker--${changeMarker}`}
          title={t(`tree.changeMarker.${changeMarker}`)}
          aria-hidden="true"
        />
      )}

      {editingField === "name" ? (
        <InlineEditor
          initialValue={node.name}
          onCommit={(text) => onCommitEdit("name", text)}
          onCancel={onCancelEdit}
        />
      ) : isCommentRow ? (
        // The stored name is "#comment" (it exists so paths read like the DOM convention);
        // showing the XML marker instead is what a reader actually recognizes. A double-click
        // edits the comment TEXT — a comment has no name to rename.
        <span
          className="tree-row__comment-marker"
          onDoubleClick={(event) => {
            event.stopPropagation();
            onSelect("none");
            onStartEditValue();
          }}
        >
          &lt;!--
        </span>
      ) : (
        <span
          className="tree-row__name"
          onDoubleClick={(event) => {
            // Inside a commented-out subtree nothing is editable: the file holds the comment's
            // raw text, so an edit here would be silently dropped on save.
            if (insideComment) return;
            event.stopPropagation();
            onSelect("none"); // editing acts on this one node — collapse any multi-selection
            onStartEditName();
          }}
        >
          {node.name}
        </span>
      )}

      {node.attributes.length > 0 && (
        <span className="tree-row__attrs">
          {node.attributes.map((a) => `${a.name}="${a.value}"`).join(" ")}
        </span>
      )}

      {editingField === "value" ? (
        <InlineEditor
          initialValue={node.value ?? ""}
          onCommit={(text) => onCommitEdit("value", text)}
          onCancel={onCancelEdit}
        />
      ) : (
        preview !== "" && (
          <span
            className="tree-row__preview"
            onDoubleClick={(event) => {
              if (hasChildren && !isCommentRow) return; // only leaf values are directly editable
              if (insideComment) return; // read-only, see the name handler above
              event.stopPropagation();
              onSelect("none"); // editing acts on this one node — collapse any multi-selection
              onStartEditValue();
            }}
          >
            {preview}
          </span>
        )
      )}

      {!hasChildren && editingField !== "value" && looksLikeBase64(node.value) && (
        <button
          className="tree-row__base64"
          title={t("base64.decode")}
          onClick={(event) => {
            event.stopPropagation();
            onSelect("none"); // decoding acts on this one node — collapse any multi-selection
            onDecodeBase64();
          }}
        >
          base64
        </button>
      )}
    </div>
  );
}

/** A deleted-since-baseline node's placeholder row — purely informational, no click behavior
 * (grill session 2026-07-22 decision: "rein informativ, keine Aktion"; restoring only via the
 * normal undo). See CONTEXT.md "Tombstone". */
function TombstoneRowView({ tombstone, depth, top }: { tombstone: Tombstone; depth: number; top: number }): React.ReactElement {
  const { t } = useI18n();
  const preview = tombstone.childCount > 0 ? `(${tombstone.childCount})` : "";
  return (
    <div
      className="tree-row tree-row--tombstone"
      style={{ top, height: ROW_HEIGHT, paddingLeft: depth * 16, "--indent": `${depth * 16}px` } as React.CSSProperties}
      title={t("tree.tombstone.title")}
    >
      <span className="tree-row__twisty" />
      <span className="tree-row__name">{tombstone.name}</span>
      {preview !== "" && <span className="tree-row__preview">{preview}</span>}
    </div>
  );
}

function InlineEditor({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="tree-row__editor"
      value={text}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(text);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        event.stopPropagation();
      }}
    />
  );
}
