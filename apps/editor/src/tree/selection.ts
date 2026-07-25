import type { TreeRow } from "./flatten.js";

/**
 * Tree selection state. `ids` are the selected nodes; `anchorId` is the fixed end a Shift+click /
 * Shift+arrow range is measured FROM (the last node picked without Shift), `leadId` the moving
 * end. Selection is deliberately unordered and may span different parents and depths — the
 * "which nodes" question only; the "what may I do with them" question lives with the individual
 * actions.
 *
 * Anchor and lead are separate because a range must be able to SHRINK: with only an anchor,
 * Shift+Down then Shift+Up would grow the selection in the other direction instead of undoing
 * the last step.
 *
 * A plain single click collapses this back to exactly one id, so the pre-multi-select behaviour
 * is just the one-element case of this same model.
 */
export interface Selection {
  ids: ReadonlySet<string>;
  anchorId: string | null;
  leadId: string | null;
}

export const EMPTY_SELECTION: Selection = { ids: new Set(), anchorId: null, leadId: null };

/** Which selection gesture a click carried: plain, Ctrl (toggle one), or Shift (span a range). */
export type SelectModifier = "none" | "toggle" | "range";

/** Reads the selection gesture off a mouse event — Ctrl (Cmd on macOS) toggles, Shift spans. */
export function selectModifierOf(event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): SelectModifier {
  if (event.shiftKey) return "range";
  if (event.ctrlKey || event.metaKey) return "toggle";
  return "none";
}

export function isSelected(selection: Selection, nodeId: string): boolean {
  return selection.ids.has(nodeId);
}

/** The single selected node, or null when nothing or MORE than one node is selected — the guard
 * every single-node-only action (rename, edit value, add child, attributes panel) asks for. */
export function soleSelectedId(selection: Selection): string | null {
  if (selection.ids.size !== 1) return null;
  const [only] = selection.ids;
  return only ?? null;
}

/** Plain click / arrow key without modifiers: exactly this node, and it becomes both ends. */
export function selectOnly(nodeId: string): Selection {
  return { ids: new Set([nodeId]), anchorId: nodeId, leadId: nodeId };
}

/**
 * Ctrl+click: add the node if absent, remove it if present. The toggled node becomes the anchor
 * even when it was just REMOVED — a following Shift+click then spans from where the user last
 * pointed, which is what makes "ctrl-click a few, then shift-click a range" feel predictable.
 */
export function toggle(selection: Selection, nodeId: string): Selection {
  const ids = new Set(selection.ids);
  if (ids.has(nodeId)) ids.delete(nodeId);
  else ids.add(nodeId);
  return { ids, anchorId: nodeId, leadId: nodeId };
}

/**
 * Shift+click / Shift+arrow: select every row between the anchor and `nodeId` inclusive, in
 * the CURRENT flattened row order (so a range follows what the user actually sees, collapsed
 * subtrees included/excluded exactly as displayed). The anchor stays put, so repeatedly
 * shift-clicking re-spans from the same origin instead of creeping.
 *
 * Replaces the previous selection rather than adding to it (same as file explorers). Without a
 * usable anchor — none set yet, or it scrolled out of the visible rows after a collapse — this
 * degrades to selecting just `nodeId`.
 */
export function selectRange(selection: Selection, rows: TreeRow[], nodeId: string): Selection {
  const anchorIndex = selection.anchorId ? rows.findIndex((row) => row.node.id === selection.anchorId) : -1;
  const targetIndex = rows.findIndex((row) => row.node.id === nodeId);
  if (anchorIndex === -1 || targetIndex === -1) return selectOnly(nodeId);
  const [from, to] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const ids = new Set<string>();
  for (let i = from; i <= to; i++) ids.add(rows[i]!.node.id);
  return { ids, anchorId: selection.anchorId, leadId: nodeId };
}

/**
 * Shift+Down/Up: moves the range's LEAD end one row and re-spans from the anchor, so reversing
 * direction shrinks the range again instead of growing it the other way. `delta` is `+1`
 * (down) or `-1` (up); the lead stops at the list's ends. With nothing selected yet this
 * behaves like a plain arrow key onto the first/last row.
 */
export function extendSelection(selection: Selection, rows: TreeRow[], delta: number): Selection {
  if (rows.length === 0) return selection;
  const leadIndex = selection.leadId ? rows.findIndex((row) => row.node.id === selection.leadId) : -1;
  if (leadIndex === -1) return selectOnly(rows[delta > 0 ? 0 : rows.length - 1]!.node.id);
  const nextIndex = Math.min(rows.length - 1, Math.max(0, leadIndex + delta));
  return selectRange(selection, rows, rows[nextIndex]!.node.id);
}

/** The selected rows in visible (flattened) order — the order every bulk action serializes,
 * copies, or moves in, so results follow the tree rather than the click sequence. */
export function selectedRowsInOrder(selection: Selection, rows: TreeRow[]): TreeRow[] {
  return rows.filter((row) => selection.ids.has(row.node.id));
}

/**
 * Drops ids that are no longer present in `rows` (deleted, or hidden inside a collapsed parent
 * or the search filter). Returns the SAME object when nothing changed, so callers can use it as
 * a React state updater without causing a re-render on every keystroke.
 */
export function pruneSelection(selection: Selection, rows: TreeRow[]): Selection {
  const visible = new Set(rows.map((row) => row.node.id));
  const kept = [...selection.ids].filter((id) => visible.has(id));
  if (kept.length === selection.ids.size) return selection;
  return {
    ids: new Set(kept),
    anchorId: selection.anchorId && visible.has(selection.anchorId) ? selection.anchorId : null,
    leadId: selection.leadId && visible.has(selection.leadId) ? selection.leadId : null,
  };
}

/**
 * Right-click target rule (file-explorer convention): clicking an already-selected node keeps
 * the whole multi-selection so the menu can act on all of it; clicking anywhere else collapses
 * to that one node first. Same rule decides what a drag carries.
 */
export function selectionForActionOn(selection: Selection, nodeId: string): Selection {
  return selection.ids.has(nodeId) ? selection : selectOnly(nodeId);
}
