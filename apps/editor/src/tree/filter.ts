import type { DocNode } from "@jaxel/core";
import type { TreeRow } from "./flatten.js";
import { walkTree } from "./walk.js";

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

  walkTree(root, (node, ancestors) => {
    if (matchedIds.has(node.id)) {
      for (const ancestor of ancestors) keep.add(ancestor.id);
      if (includeSubtree) {
        markSubtree(node);
        return false; // everything below is kept anyway — no need to walk it again
      }
      keep.add(node.id);
    }
    return true;
  });

  return keep;
}

/**
 * Depth-first flattening for filter mode: ignores the expanded/collapsed state and
 * emits exactly the nodes in `keep`, at their real tree depth (indentation keeps
 * communicating the hierarchy even though hidden siblings make rows non-contiguous).
 */
export function flattenFiltered(root: DocNode, keep: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  walkTree(root, (node, ancestors, depth) => {
    if (keep.has(node.id)) {
      rows.push({ node, ancestors, depth, hasChildren: node.children.length > 0 });
    }
    return true; // filter narrows what's PUSHED, not what's walked
  });
  return rows;
}
