import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DocNode } from "@jaxel/core";
import { flattenTree, type TreeRow } from "./flatten.js";

const ROW_HEIGHT = 22;
const OVERSCAN = 8;

export type EditingField = { nodeId: string; field: "name" | "value" };

interface TreeViewProps {
  root: DocNode;
  /**
   * Commands mutate the tree in place, so `root` never changes reference on edits —
   * `revision` (bumped by CommandBus on every execute/undo/redo) is what actually
   * invalidates the flattened row list. Without it, structural changes (insert/remove)
   * would not appear (name/value edits still "work" only because each already-rendered
   * row reads its live DocNode's fields directly at render time).
   */
  revision: number;
  selectedId: string | null;
  onSelect: (row: TreeRow) => void;
  editingField: EditingField | null;
  /** Click on the name of an ALREADY-selected row (Finder-style rename-on-second-click). */
  onStartEditName: (row: TreeRow) => void;
  onStartEditValue: (row: TreeRow) => void;
  onCommitEdit: (row: TreeRow, field: "name" | "value", newText: string) => void;
  onCancelEdit: () => void;
}

/**
 * Virtualized tree: only rows within the scrolled viewport (plus a small overscan) are
 * mounted, so this stays responsive for documents with tens/hundreds of thousands of nodes.
 */
export function TreeView({
  root,
  revision,
  selectedId,
  onSelect,
  editingField,
  onStartEditName,
  onStartEditValue,
  onCommitEdit,
  onCancelEdit,
}: TreeViewProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.id]));
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

  const rows = useMemo(() => flattenTree(root, expanded), [root, expanded, revision]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = rows.slice(startIndex, endIndex);

  function toggle(id: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
            onToggle={() => toggle(row.node.id)}
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

  return (
    <div
      className={`tree-row${selected ? " tree-row--selected" : ""}`}
      style={{ top, height: ROW_HEIGHT, paddingLeft: depth * 16 }}
      onClick={onSelect}
    >
      <span
        className="tree-row__twisty"
        onClick={(event) => {
          event.stopPropagation();
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
          onClick={(event) => {
            if (selected) {
              event.stopPropagation();
              onStartEditName();
            }
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
