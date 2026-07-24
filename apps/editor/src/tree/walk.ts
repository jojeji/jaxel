import type { DocNode } from "@jaxel/core";

/**
 * Depth-first walk over `root`, invoking `visit(node, ancestors, depth)` for every node
 * (root first; `ancestors` is root-first, NOT including `node` itself). Returning `false`
 * from `visit` skips that node's children (used by `flattenTree` to stop at collapsed
 * nodes); returning anything else (or nothing) descends into every child.
 *
 * Shared by flatten.ts/filter.ts, which previously hand-rolled this exact
 * `[...ancestors, node]`-accumulating recursion three times with only the push/recurse
 * predicate differing.
 */
export function walkTree(
  root: DocNode,
  visit: (node: DocNode, ancestors: DocNode[], depth: number) => boolean | void,
): void {
  function step(node: DocNode, ancestors: DocNode[], depth: number): void {
    const shouldRecurse = visit(node, ancestors, depth) !== false;
    if (shouldRecurse) {
      const nextAncestors = [...ancestors, node];
      for (const child of node.children) step(child, nextAncestors, depth + 1);
    }
  }
  step(root, [], 0);
}
