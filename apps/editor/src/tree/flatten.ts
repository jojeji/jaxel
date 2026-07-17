import type { DocNode } from "@jaxel/core";

export interface TreeRow {
  node: DocNode;
  /** Chain from the document root down to (not including) `node` — root first. */
  ancestors: DocNode[];
  depth: number;
  hasChildren: boolean;
}

/** Depth-first flattening of the visible (expanded) part of the tree, root first. */
export function flattenTree(root: DocNode, expanded: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];

  function visit(node: DocNode, ancestors: DocNode[], depth: number): void {
    const hasChildren = node.children.length > 0;
    rows.push({ node, ancestors, depth, hasChildren });
    if (hasChildren && expanded.has(node.id)) {
      const nextAncestors = [...ancestors, node];
      for (const child of node.children) {
        visit(child, nextAncestors, depth + 1);
      }
    }
  }

  visit(root, [], 0);
  return rows;
}
