import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TreeRow } from "./flatten.js";

const ROW_HEIGHT = 22;
const OVERSCAN = 8;

export type EditingField = { nodeId: string; field: "name" | "value" };

interface TreeViewProps {
  /**
   * Already-flattened visible rows. Expanded/collapsed state (and filter mode) live in
   * App, which computes this list — TreeView only virtualizes and renders it.
   */
  rows: TreeRow[];
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (row: TreeRow) => void;
  onSelect: (row: TreeRow) => void;
  editingField: EditingField | null;
  onStartEditName: (row: TreeRow) => void;
  onStartEditValue: (row: TreeRow) => void;
  onCommitEdit: (row: TreeRow, field: "name" | "value", newText: string) => void;
  onCancelEdit: () => void;
  /**
   * When set (e.g. by "next search match" or keyboard navigation), scrolls this node's
   * row into view. Expanding its ancestors is App's job (it owns the expanded set).
   */
  revealNodeId?: string | null;
}

/**
 * Virtualized tree: only rows within the scrolled viewport (plus a small overscan) are
 * mounted, so this stays responsive for documents with tens/hundreds of thousands of nodes.
 */
export function TreeView({
  rows,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  editingField,
  onStartEditName,
  onStartEditValue,
  onCommitEdit,
  onCancelEdit,
  revealNodeId,
}: TreeViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!revealNodeId) return;
    const index = rows.findIndex((row) => row.node.id === revealNodeId);
    if (index === -1) return; // ancestors not expanded yet in this pass; the next effect run will catch it
    const target = index * ROW_HEIGHT;
    setScrollTop((current) => {
      const viewBottom = current + viewportHeight;
      if (target >= current && target + ROW_HEIGHT <= viewBottom) return current;
      const next = Math.max(0, target - viewportHeight / 2);
      if (containerRef.current) containerRef.current.scrollTop = next;
      return next;
    });
  }, [revealNodeId, rows, viewportHeight]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="tree-view"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="tree-view__spacer" style={{ height: rows.length * ROW_HEIGHT }}>
        {visibleRows.map((row, i) => (
          <TreeRowView
            key={row.node.id}
            row={row}
            top={(startIndex + i) * ROW_HEIGHT}
            expanded={expanded.has(row.node.id)}
            selected={row.node.id === selectedId}
            editingField={editingField?.nodeId === row.node.id ? editingField.field : null}
            onToggle={() => onToggle(row)}
            onSelect={() => onSelect(row)}
            onStartEditName={() => onStartEditName(row)}
            onStartEditValue={() => onStartEditValue(row)}
            onCommitEdit={(field, text) => onCommitEdit(row, field, text)}
            onCancelEdit={onCancelEdit}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeRowViewProps {
  row: TreeRow;
  top: number;
  expanded: boolean;
  selected: boolean;
  editingField: "name" | "value" | null;
  onToggle: () => void;
  onSelect: () => void;
  onStartEditName: () => void;
  onStartEditValue: () => void;
  onCommitEdit: (field: "name" | "value", newText: string) => void;
  onCancelEdit: () => void;
}

function TreeRowView({
  row,
  top,
  expanded,
  selected,
  editingField,
  onToggle,
  onSelect,
  onStartEditName,
  onStartEditValue,
  onCommitEdit,
  onCancelEdit,
}: TreeRowViewProps): React.ReactElement {
  const { node, depth, hasChildren } = row;
  const preview = hasChildren ? `(${node.children.length})` : (node.value ?? "");

  // Single click selects AND toggles (double-click fires two clicks first, so a toggle
  // pair cancels itself out before the name/value editor opens — net-neutral by design).
  function handleRowClick(): void {
    onSelect();
    if (hasChildren) onToggle();
  }

  return (
    <div
      className={`tree-row${selected ? " tree-row--selected" : ""}`}
      style={{ top, height: ROW_HEIGHT, paddingLeft: depth * 16 }}
      onClick={handleRowClick}
    >
      <span
        className="tree-row__twisty"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onToggle();
        }}
      >
        {hasChildren ? (expanded ? "▾" : "▸") : ""}
      </span>

      {editingField === "name" ? (
        <InlineEditor
          initialValue={node.name}
          onCommit={(text) => onCommitEdit("name", text)}
          onCancel={onCancelEdit}
        />
      ) : (
        <span
          className="tree-row__name"
          onDoubleClick={(event) => {
            event.stopPropagation();
            onSelect();
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
              if (hasChildren) return; // only leaf values are directly editable
              event.stopPropagation();
              onSelect();
              onStartEditValue();
            }}
          >
            {preview}
          </span>
        )
      )}
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
