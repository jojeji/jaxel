import React from "react";
import type { DocNode } from "@jaxel/core";

interface FocusBreadcrumbProps {
  /** True ancestor chain from the real document root down to (not including) the focus node. */
  ancestors: DocNode[];
  focusNode: DocNode;
  /** Index into `ancestors` that was clicked — 0 means "the real root" (leave focus entirely). */
  onNavigate: (index: number) => void;
}

/**
 * Shown above the tree while a "focused view ab Knoten X" tab is active (see
 * docs/entscheidungen.md 2026-07-18 #1). Clicking an earlier segment re-targets the focus to
 * that ancestor; clicking the real root (first segment) leaves focus mode entirely.
 */
export function FocusBreadcrumb({ ancestors, focusNode, onNavigate }: FocusBreadcrumbProps): React.ReactElement {
  return (
    <div className="focus-breadcrumb">
      {ancestors.map((ancestor, index) => (
        <React.Fragment key={ancestor.id}>
          <button className="focus-breadcrumb__segment" onClick={() => onNavigate(index)}>
            {ancestor.name}
          </button>
          <span className="focus-breadcrumb__sep">›</span>
        </React.Fragment>
      ))}
      <span className="focus-breadcrumb__current">{focusNode.name}</span>
    </div>
  );
}
