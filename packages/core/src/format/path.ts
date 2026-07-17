/**
 * Path computation for DocNode trees ("copy path" feature).
 *
 * Two path flavors are supported:
 * - indexed: e.g. "person[0].name" — pins down exactly one node, using the position
 *   among same-named siblings wherever that position is ambiguous.
 * - static: e.g. "person.name" — describes the structural/schema shape, never indexed.
 *
 * Because a JSON array is represented as several same-named sibling DocNodes (see
 * docs/entscheidungen.md #4), "index among same-named siblings" is the one concept
 * that drives indexed paths for both XML- and JSON-origin documents — there is no
 * separate "array index" notion in the tree itself.
 *
 * Scope (V1, deliberate simplifications):
 * - Only `children` tree position is addressed. XML attributes (`DocNode.attributes`)
 *   have no position of their own in this tree and are therefore ignored entirely —
 *   attribute paths are out of scope for this module.
 * - Segments are always joined with "." and element/property names are emitted
 *   verbatim, with no escaping. A name that itself contains "." or "[" would produce
 *   an ambiguous path; that's accepted for V1 rather than adding escaping rules nobody
 *   asked for yet.
 */

import type { DocNode } from "../model/node.js";

export interface PathSegment {
  name: string;
  /** 0-based index among siblings that share this node's name (not the overall child index). */
  indexAmongSameName: number;
  /** True only when at least one other child of the same parent shares this node's name. */
  hasSiblingsWithSameName: boolean;
}

/**
 * Builds the segment chain from the root to (and including) `target`.
 *
 * `ancestors` is the chain of ancestor nodes from the root down to target's direct
 * parent (root first, target's parent last; target itself is NOT included) — typically
 * obtained by the caller via a tree traversal. The root segment (first element) always
 * gets indexAmongSameName=0 / hasSiblingsWithSameName=false, since a root has no
 * siblings by definition.
 */
export function getPathSegments(target: DocNode, ancestors: DocNode[]): PathSegment[] {
  const chain = [...ancestors, target];
  const segments: PathSegment[] = [];

  for (let i = 0; i < chain.length; i++) {
    const node = chain[i]!;
    if (i === 0) {
      segments.push({ name: node.name, indexAmongSameName: 0, hasSiblingsWithSameName: false });
      continue;
    }
    const parent = chain[i - 1]!;
    const sameNameSiblings = parent.children.filter((c) => c.name === node.name);
    const indexAmongSameName = sameNameSiblings.indexOf(node);
    segments.push({
      name: node.name,
      // Should always be found (node came from parent.children); -1 fallback only
      // guards against a caller passing an inconsistent ancestors/target combination.
      indexAmongSameName: indexAmongSameName === -1 ? 0 : indexAmongSameName,
      hasSiblingsWithSameName: sameNameSiblings.length > 1,
    });
  }

  return segments;
}

/**
 * The root's own segment (segments[0]) is never rendered as a "rootname." prefix in
 * either path flavor — a path is relative to the document root by convention. The sole
 * exception is a path *to* the root itself (a single-element segment chain), where the
 * root's name is the entire, and only, output.
 */
function segmentsToRender(segments: PathSegment[]): PathSegment[] {
  return segments.length > 1 ? segments.slice(1) : segments;
}

/**
 * e.g. "person[0].name". Only segments with hasSiblingsWithSameName=true get an
 * "[index]" suffix; unique-named segments stay bare (e.g. "settings.theme", not
 * "settings[0].theme[0]") so paths to unambiguous elements stay compact.
 */
export function formatIndexedPath(segments: PathSegment[]): string {
  return segmentsToRender(segments)
    .map((s) => (s.hasSiblingsWithSameName ? `${s.name}[${s.indexAmongSameName}]` : s.name))
    .join(".");
}

/** e.g. "person.name". Never includes indices, even when siblings share a name. */
export function formatStaticPath(segments: PathSegment[]): string {
  return segmentsToRender(segments)
    .map((s) => s.name)
    .join(".");
}

/**
 * Depth-first search for `target` under `root`, returning the ancestor chain (root to
 * target's parent, root itself included, target excluded), or `null` if `target` is not
 * `root` and not found anywhere in `root`'s descendants.
 *
 * Exported because callers building mutation Commands (see ../commands/*.ts) need this
 * exact chain shape to invalidate byteRange up to the root — not just path formatting.
 */
export function findAncestorChain(node: DocNode, target: DocNode, path: DocNode[] = []): DocNode[] | null {
  if (node === target) {
    return path;
  }
  for (const child of node.children) {
    const found = findAncestorChain(child, target, [...path, node]);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/**
 * Convenience wrapper: locates `target` under `root` via depth-first traversal of
 * `children`, then returns both path flavors. Throws if `target` is not `root` itself
 * and not a descendant of `root`.
 */
export function computePaths(root: DocNode, target: DocNode): { indexed: string; static: string } {
  const ancestors = findAncestorChain(root, target, []);
  if (ancestors === null) {
    throw new Error(
      `computePaths: node "${target.name}" (id=${target.id}) is not root "${root.name}" (id=${root.id}) and not one of its descendants`,
    );
  }
  const segments = getPathSegments(target, ancestors);
  return { indexed: formatIndexedPath(segments), static: formatStaticPath(segments) };
}
