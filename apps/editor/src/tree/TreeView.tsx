import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DocNode } from "@jaxel/core";
import { flattenTree, type TreeRow } from "./flatten.js";

const ROW_HEIGHT = 22;
const OVERSCAN = 8;

interface TreeViewProps {
  root: DocNode;
  selectedId: string | null;
  onSelect: (row: TreeRow) => void;
}

/**
 * Virtualized tree: only rows within the scrolled viewport (plus a small overscan) are
 * mounted, so this stays responsive for documents with tens/hundreds of thousands of nodes.
 */
export function TreeView({ root, selectedId, onSelect }: TreeViewProps): React.ReactElement {
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

  const rows = useMemo(() => flattenTree(root, expanded), [root, expanded]);

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
            onToggle={() => toggle(row.node.id)}
            onSelect={() => onSelect(row)}
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
  onToggle: () => void;
  onSelect: () => void;
}

function TreeRowView({ row, top, expanded, selected, onToggle, onSelect }: TreeRowViewProps): React.ReactElement {
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
      <span className="tree-row__name">{node.name}</span>
      {node.attributes.length > 0 && (
        <span className="tree-row__attrs">
          {node.attributes.map((a) => `${a.name}="${a.value}"`).join(" ")}
        </span>
      )}
      {preview !== "" && <span className="tree-row__preview">{preview}</span>}
    </div>
  );
}
