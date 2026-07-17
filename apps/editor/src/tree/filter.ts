import type { DocNode } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";

/**
 * Computes the set of node ids to keep visible in filter mode: every match, its full
 * ancestor chain (so the path context stays readable) and — when `includeSubtree` is
 * set (Grundeinstellung, see settings-store) — everything below a match too.
 */
export function buildFilterKeepSet(
  root: DocNode,
  matchedIds: ReadonlySet<string>,
  includeSubtree: boolean,
): Set<string> {
  const keep = new Set<string>();

  function markSubtree(node: DocNode): void {
    keep.add(node.id);
    for (const child of node.children) markSubtree(child);
  }

  function visit(node: DocNode, ancestors: DocNode[]): void {
    if (matchedIds.has(node.id)) {
      for (const ancestor of ancestors) keep.add(ancestor.id);
      if (includeSubtree) {
        markSubtree(node);
        return; // everything below is kept anyway
      }
      keep.add(node.id);
    }
    const next = [...ancestors, node];
    for (const child of node.children) visit(child, next);
  }

  visit(root, []);
  return keep;
}

/**
 * Depth-first flattening for filter mode: ignores the expanded/collapsed state and
 * emits exactly the nodes in `keep`, at their real tree depth (indentation keeps
 * communicating the hierarchy even though hidden siblings make rows non-contiguous).
 */
export function flattenFiltered(root: DocNode, keep: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];

  function visit(node: DocNode, ancestors: DocNode[], depth: number): void {
    if (keep.has(node.id)) {
      rows.push({ node, ancestors, depth, hasChildren: node.children.length > 0 });
    }
    const next = [...ancestors, node];
    for (const child of node.children) visit(child, next, depth + 1);
  }

  visit(root, [], 0);
  return rows;
}
