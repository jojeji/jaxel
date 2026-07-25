import { cloneSubtree, type DocNode } from "../model/node.js";
import type { Command } from "./command.js";
import { createCompositeCommand } from "./composite.js";
import { createInsertNodeCommand } from "./insert-node.js";
import { createRemoveNodeCommand } from "./remove-node.js";
import { findSiblingSlot } from "./sibling-slot.js";
import { createMoveNodeCommand, planMove, type DropPosition } from "./move-node.js";

/** The row shape every bulk operation works from — a node plus its root-first ancestor chain,
 * i.e. exactly what the UI's flattened tree rows already carry. */
export interface BulkRow {
  node: DocNode;
  ancestors: DocNode[];
}

/**
 * Drops rows that already have an ancestor in the same set — the "select a parent AND its own
 * child, then delete" case. Operating on both would remove the child twice (once on its own,
 * once inside its parent's subtree), which no bulk operation can undo correctly.
 *
 * Every bulk function below funnels through this first, so callers may pass a raw selection.
 */
export function topmostRows(rows: BulkRow[]): BulkRow[] {
  const selectedIds = new Set(rows.map((row) => row.node.id));
  return rows.filter((row) => !row.ancestors.some((ancestor) => selectedIds.has(ancestor.id)));
}

/** Rows paired with the slot they occupy, sorted so that removing them one after another stays
 * correct: descending index within each parent, so an earlier removal never shifts a later
 * one's index. Rows without a slot (the root, or a stale row) are dropped. */
function removableSlotsDescending(rows: BulkRow[]): Array<{ parent: DocNode; index: number; parentAncestors: DocNode[] }> {
  return rows
    .map((row) => findSiblingSlot(row))
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    .sort((a, b) => b.index - a.index);
}

/**
 * Removes every selected node as ONE undo step. Returns `null` when nothing is removable (empty
 * selection, or only the root — which has no sibling slot to be removed from).
 */
export function createBulkRemoveCommand(rows: BulkRow[]): Command | null {
  const slots = removableSlotsDescending(topmostRows(rows));
  if (slots.length === 0) return null;
  const commands = slots.map((slot) => createRemoveNodeCommand(slot.parent, slot.index, slot.parentAncestors));
  return createCompositeCommand("bulk-remove", commands);
}

/**
 * Deep-copies every selected node in as its own next sibling, as ONE undo step. Returns the
 * command plus the fresh clones (the caller reveals/selects them). Returns `null` when nothing
 * is duplicable.
 *
 * Insertions run in descending index order for the same reason removals do — an insertion at a
 * lower index would otherwise shift the slots computed for the rows below it.
 */
export function createBulkDuplicateCommand(rows: BulkRow[]): { command: Command; clones: DocNode[] } | null {
  const slots = removableSlotsDescending(topmostRows(rows));
  if (slots.length === 0) return null;
  const clones: DocNode[] = [];
  const commands = slots.map((slot) => {
    const clone = cloneSubtree(slot.parent.children[slot.index]!);
    clones.push(clone);
    return createInsertNodeCommand(slot.parent, slot.index + 1, clone, slot.parentAncestors);
  });
  return { command: createCompositeCommand("bulk-duplicate", commands), clones };
}

/**
 * Inserts several nodes consecutively at one spot, as ONE undo step — the paste counterpart of
 * `createBulkDuplicateCommand`. `index` is the position the FIRST node lands at; the rest follow
 * in order.
 */
export function createBulkInsertCommand(
  parent: DocNode,
  index: number,
  nodes: DocNode[],
  parentAncestors: DocNode[],
): Command | null {
  if (nodes.length === 0) return null;
  const commands = nodes.map((node, offset) =>
    createInsertNodeCommand(parent, index + offset, node, parentAncestors),
  );
  return createCompositeCommand("bulk-insert", commands);
}

/**
 * Moves several selected nodes to one drop target as ONE undo step, keeping their relative
 * order. Sources may sit under different parents (selection is not restricted to siblings).
 *
 * Expressed as "remove every source, then re-insert them all at the target" rather than as a
 * chain of individual moves: individual moves would invalidate each other's captured indices as
 * the composite runs. The target index is therefore corrected for those removals that happen
 * ABOVE it inside the target's own parent.
 *
 * `rows` must already be in the order the nodes should end up in (visible/flattened order).
 * Returns `null` when the move is impossible: nothing movable, dropping into the selection
 * itself, or dropping into a node that is a descendant of one of the moved nodes.
 *
 * A single source delegates to `planMove` so the long-standing single-node drag path — including
 * its no-op detection — keeps behaving exactly as before. For several sources an exact no-op
 * (dropping a block back onto itself) is not detected and produces an empty-effect undo step;
 * accepted as a rare, harmless case rather than growing the position arithmetic further.
 */
export function createBulkMoveCommand(rows: BulkRow[], target: BulkRow, position: DropPosition): Command | null {
  const sources = topmostRows(rows);
  if (sources.length === 0) return null;

  // Never drop a node into itself or into its own subtree — the node would vanish from the tree.
  const sourceIds = new Set(sources.map((row) => row.node.id));
  if (sourceIds.has(target.node.id) && position === "into") return null;
  if (target.ancestors.some((ancestor) => sourceIds.has(ancestor.id))) return null;

  if (sources.length === 1) {
    const plan = planMove(sources[0]!, target, position);
    if (!plan) return null;
    return createMoveNodeCommand(
      plan.sourceParent,
      plan.sourceIndex,
      plan.sourceAncestors,
      plan.targetParent,
      plan.targetIndex,
      plan.targetAncestors,
    );
  }

  let targetParent: DocNode;
  let targetAncestors: DocNode[];
  let dropIndex: number;
  if (position === "into") {
    targetParent = target.node;
    targetAncestors = target.ancestors;
    dropIndex = target.node.children.length;
  } else {
    const parent = target.ancestors[target.ancestors.length - 1];
    if (!parent) return null; // the root has no siblings to drop beside
    targetParent = parent;
    targetAncestors = target.ancestors.slice(0, -1);
    const anchorIndex = parent.children.indexOf(target.node);
    if (anchorIndex === -1) return null; // stale target row
    dropIndex = position === "after" ? anchorIndex + 1 : anchorIndex;
  }

  const slots = sources
    .map((row) => findSiblingSlot(row))
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null);
  if (slots.length === 0) return null;

  // Each source removed from ABOVE the drop point inside the target's own parent shifts the
  // insertion position down by one.
  const removedAbove = slots.filter((slot) => slot.parent === targetParent && slot.index < dropIndex).length;
  const insertAt = dropIndex - removedAbove;

  const removals = [...slots]
    .sort((a, b) => b.index - a.index)
    .map((slot) => createRemoveNodeCommand(slot.parent, slot.index, slot.parentAncestors));
  const insertions = sources.map((row, offset) =>
    createInsertNodeCommand(targetParent, insertAt + offset, row.node, targetAncestors),
  );

  return createCompositeCommand("bulk-move", [...removals, ...insertions]);
}
