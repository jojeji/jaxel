/**
 * Baumaktionen (CONTEXT.md): every mutation a user triggers on tree rows — insert, delete,
 * duplicate, paste, move, comment out/in, and the inline/attribute edits of one row.
 *
 * One module decides two things for all of them:
 *   1. whether the action is allowed for these rows, and why not (`treeActionBlocker`) — the
 *      same answer greys out menu entries and stops keyboard shortcuts, so the two cannot drift;
 *   2. the Command plus what the UI should select/expand/edit afterwards (`planTreeAction`).
 *
 * The central rule it enforces is the read-only status of an Auskommentierter Teilbaum: the
 * file holds the comment's raw text, so any node inserted into, moved into, or edited inside a
 * comment would silently vanish on the next save. Before this module the rule lived as seven
 * separate checks in App.tsx, and two actions (paste, add child under a comment) had none.
 */

import { createCommentNode, createNode, type DocNode } from "../model/node.js";
import type { DocFormat } from "../model/document.js";
import type { Command } from "./command.js";
import { createCompositeCommand } from "./composite.js";
import { createInsertNodeCommand } from "./insert-node.js";
import { createRenameCommand } from "./rename.js";
import { createSetValueCommand, jsonTypeAfterEdit } from "./set-value.js";
import { createSetAttributeCommand } from "./set-attribute.js";
import { createRenameAttributeCommand } from "./rename-attribute.js";
import {
  commentOutBlocker,
  createCommentOutCommand,
  createUncommentCommand,
  isValidCommentText,
} from "./comment.js";
import { findSiblingSlot, planInsertRelativeToRow } from "./sibling-slot.js";
import {
  createBulkDuplicateCommand,
  createBulkInsertCommand,
  createBulkMoveCommand,
  createBulkRemoveCommand,
  topmostRows,
  type BulkRow,
} from "./bulk.js";
import type { DropPosition } from "./move-node.js";
import { isValidXmlName } from "../format/convert.js";

export type TreeAction =
  | { kind: "add-child" }
  | { kind: "add-sibling" }
  | { kind: "add-comment" }
  | { kind: "add-comment-child" }
  | { kind: "delete" }
  | { kind: "duplicate" }
  | { kind: "comment-out" }
  | { kind: "uncomment" }
  /** `fragments` as parsed from the clipboard; pasted after the LAST row. */
  | { kind: "paste"; fragments: DocNode[] }
  /** The rows are the dragged nodes, in visible order. */
  | { kind: "move"; target: BulkRow; position: DropPosition }
  | { kind: "rename"; name: string }
  | { kind: "set-value"; value: string }
  | { kind: "set-attribute"; name: string; value: string | null; coalesceKey?: string }
  | { kind: "rename-attribute"; index: number; name: string; coalesceKey: string };

export type TreeActionKind = TreeAction["kind"];

export type TreeActionBlocker =
  /** Nothing selected, or several rows for an action that needs exactly one. */
  | "no-selection"
  /** The action would change a commented-out subtree (or put a child under a comment). */
  | "read-only"
  /** Only the tab's visible root is selected, which has no sibling slot. */
  | "root"
  | "xml-only"
  /** Comment-out: XML has no nested comments. */
  | "contains-comment"
  /** Comment-out, or a comment text edit: `--` is illegal inside an XML comment. */
  | "contains-double-hyphen"
  /** Comment text edit: "--" inside, or "-" at the end — not well-formed XML (see isValidCommentText). */
  | "invalid-comment-text"
  /** Uncomment: not every row is a commented-out subtree. */
  | "not-commented-subtree"
  /** Paste: nothing to insert, or a bare JSON array/primitive without a name. */
  | "invalid-fragment"
  /** Move: into itself, into its own subtree, or beside the root. */
  | "invalid-target"
  /** An edit that would not change anything (same text, empty name). */
  | "no-change"
  /** XML only: the new element or attribute name is not a valid XML name ("my item", "1st") —
   * saved, it would make a file no XML parser, Jaxel included, can open again. */
  | "invalid-name";

export interface TreeActionContext {
  format: DocFormat;
  /** Indentation of the document, for the markup a comment-out writes. */
  indent: string;
}

export interface TreeActionPlan {
  command: Command;
  /** Node ids to select afterwards, first one scrolled into view. Empty: clear the selection.
   * Absent (edits of one row): leave the selection as it is. */
  select?: string[];
  /** A node that must be expanded so the selected nodes are visible (they landed as children). */
  expand?: string;
  /** Open the inline editor on `select[0]` straight away. */
  edit?: "name" | "value";
}

export type TreeActionResult = { ok: true; plan: TreeActionPlan } | { ok: false; blocker: TreeActionBlocker };

/** True for a row inside an Auskommentierter Teilbaum (the comment node itself is not). */
export function isInsideComment(row: BulkRow): boolean {
  return row.ancestors.some((ancestor) => ancestor.kind === "comment");
}

/** A node may receive new children only when neither it nor anything above it is a comment. */
function acceptsChildren(row: BulkRow): boolean {
  return row.node.kind !== "comment" && !isInsideComment(row);
}

/** Where add-sibling/paste would insert: next to the row, or into it at the tab's visible root. */
function acceptsSibling(row: BulkRow): boolean {
  return row.ancestors.length === 0 ? acceptsChildren(row) : !isInsideComment(row);
}

/**
 * Why `kind` cannot run on `rows`, or null when it can. Answers from the rows alone — the
 * payload-dependent checks (a paste's fragments, a move's target, an edit's text) happen in
 * `planTreeAction`. Cheap enough to call for every menu entry on every render.
 */
export function treeActionBlocker(
  rows: BulkRow[],
  kind: TreeActionKind,
  context: TreeActionContext,
): TreeActionBlocker | null {
  const sole = rows.length === 1 ? rows[0]! : null;
  switch (kind) {
    case "add-child":
      if (!sole) return "no-selection";
      return acceptsChildren(sole) ? null : "read-only";
    case "add-sibling":
      if (!sole) return "no-selection";
      return acceptsSibling(sole) ? null : "read-only";
    case "add-comment":
      if (context.format !== "xml") return "xml-only";
      if (!sole) return "no-selection";
      return acceptsSibling(sole) ? null : "read-only";
    case "add-comment-child":
      if (context.format !== "xml") return "xml-only";
      if (!sole) return "no-selection";
      return acceptsChildren(sole) ? null : "read-only";
    case "delete":
    case "duplicate":
      if (rows.length === 0) return "no-selection";
      if (rows.some(isInsideComment)) return "read-only";
      return rows.some((row) => findSiblingSlot(row) !== null) ? null : "root";
    case "comment-out": {
      if (context.format !== "xml") return "xml-only";
      const targets = topmostRows(rows);
      if (targets.length === 0) return "no-selection";
      // A node that is already a comment, or sits inside one, has nothing to comment out.
      if (targets.some((row) => row.node.kind === "comment" || isInsideComment(row))) return "read-only";
      if (targets.some((row) => findSiblingSlot(row) === null)) return "root";
      for (const row of targets) {
        const blocker = commentOutBlocker(row.node);
        if (blocker) return blocker;
      }
      return null;
    }
    case "uncomment": {
      const targets = topmostRows(rows);
      if (targets.length === 0) return "no-selection";
      return targets.every((row) => row.node.kind === "comment" && row.node.children.length > 0)
        ? null
        : "not-commented-subtree";
    }
    case "paste": {
      const anchor = rows[rows.length - 1];
      if (!anchor) return "no-selection";
      return acceptsSibling(anchor) ? null : "read-only";
    }
    case "move":
      if (rows.length === 0) return "no-selection";
      // A comment node moves as a whole like any node; what sits inside one stays put, since the
      // comment's raw text is what gets saved.
      return rows.some(isInsideComment) ? "read-only" : null;
    case "set-value":
      if (!sole) return "no-selection";
      return isInsideComment(sole) ? "read-only" : null;
    case "rename":
    case "set-attribute":
    case "rename-attribute":
      if (!sole) return "no-selection";
      // A comment has no name and no attributes: its file form is only its text.
      return sole.node.kind === "comment" || isInsideComment(sole) ? "read-only" : null;
  }
}

/**
 * Why nothing may be dropped at `position` relative to `target`, or null. Answers from the target
 * alone, so the tree can show or hide its drop indicator while dragging: nothing lands inside a
 * comment (into it, or beside a row that is already inside one).
 */
export function moveTargetBlocker(target: BulkRow, position: DropPosition): TreeActionBlocker | null {
  if (isInsideComment(target)) return "read-only";
  if (position === "into" && target.node.kind === "comment") return "read-only";
  return null;
}

/**
 * Builds the Command for `action` on `rows`, or says why it cannot run. The one place that
 * turns a user's tree action into a mutation — the UI only executes the plan and applies the
 * follow-up selection.
 */
export function planTreeAction(rows: BulkRow[], action: TreeAction, context: TreeActionContext): TreeActionResult {
  const blocker = treeActionBlocker(rows, action.kind, context);
  if (blocker) return { ok: false, blocker };
  const plan = buildPlan(rows, action, context);
  return "command" in plan ? { ok: true, plan } : { ok: false, blocker: plan.blocker };
}

function buildPlan(
  rows: BulkRow[],
  action: TreeAction,
  context: TreeActionContext,
): TreeActionPlan | { blocker: TreeActionBlocker } {
  const sole = rows[0]!; // every single-row kind has passed the "no-selection" check
  switch (action.kind) {
    case "add-child":
      return appendChild(sole, createNode({ name: "node" }), "name");
    case "add-sibling":
      return insertRelativeTo(sole, createNode({ name: "node" }), "name");
    // A comment has no name, so editing starts on its text.
    case "add-comment":
      return insertRelativeTo(sole, createCommentNode({ text: " " }), "value");
    case "add-comment-child":
      return appendChild(sole, createCommentNode({ text: " " }), "value");
    case "delete": {
      const command = createBulkRemoveCommand(rows);
      return command ? { command, select: [] } : { blocker: "root" };
    }
    case "duplicate": {
      const result = createBulkDuplicateCommand(rows);
      return result
        ? { command: result.command, select: result.clones.map((clone) => clone.id) }
        : { blocker: "root" };
    }
    case "comment-out": {
      const commands = slotsDescending(topmostRows(rows))
        .map((slot) => createCommentOutCommand(slot.parent, slot.index, slot.parentAncestors, context.indent))
        .filter((command): command is Command => command !== null);
      return commands.length === 0 ? { blocker: "root" } : { command: single("comment-out", commands), select: [] };
    }
    case "uncomment": {
      const commands = slotsDescending(topmostRows(rows))
        .map((slot) => createUncommentCommand(slot.parent, slot.index, slot.parentAncestors))
        .filter((command): command is Command => command !== null);
      return commands.length === 0
        ? { blocker: "not-commented-subtree" }
        : { command: single("uncomment", commands), select: [] };
    }
    case "paste": {
      if (action.fragments.length === 0 || action.fragments.some((fragment) => fragment.synthetic)) {
        return { blocker: "invalid-fragment" };
      }
      const plan = planInsertRelativeToRow(rows[rows.length - 1]!);
      if (!plan) return { blocker: "no-selection" }; // stale row from an earlier render
      const command = createBulkInsertCommand(plan.parent, plan.index, action.fragments, plan.parentAncestors);
      if (!command) return { blocker: "invalid-fragment" };
      return {
        command,
        select: action.fragments.map((fragment) => fragment.id),
        expand: plan.insertedAsChild ? plan.parent.id : undefined,
      };
    }
    case "move": {
      const { target, position } = action;
      const targetBlocker = moveTargetBlocker(target, position);
      if (targetBlocker) return { blocker: targetBlocker };
      const command = createBulkMoveCommand(rows, target, position);
      if (!command) return { blocker: "invalid-target" };
      return {
        command,
        select: rows.map((row) => row.node.id),
        expand: position === "into" ? target.node.id : undefined,
      };
    }
    case "rename":
      if (action.name === sole.node.name || action.name.trim() === "") return { blocker: "no-change" };
      if (context.format === "xml" && !isValidXmlName(action.name)) return { blocker: "invalid-name" };
      return { command: createRenameCommand(sole.node, action.name, sole.ancestors) };
    case "set-value":
      if (action.value === (sole.node.value ?? "")) return { blocker: "no-change" };
      // A comment's text becomes `<!--…-->` verbatim, so "--" in it would produce a file that no
      // longer parses. Rejected rather than escaped: XML resolves no entities in comments.
      if (sole.node.kind === "comment" && !isValidCommentText(action.value)) return { blocker: "invalid-comment-text" };
      return {
        command: createSetValueCommand(sole.node, action.value, jsonTypeAfterEdit(sole.node.jsonType, action.value), sole.ancestors),
      };
    case "set-attribute": {
      const isNew = !sole.node.attributes.some((attribute) => attribute.name === action.name);
      if (isNew && context.format === "xml" && !isValidXmlName(action.name)) return { blocker: "invalid-name" };
      return {
        command: createSetAttributeCommand(sole.node, action.name, action.value, sole.ancestors, action.coalesceKey),
      };
    }
    case "rename-attribute":
      if (context.format === "xml" && !isValidXmlName(action.name)) return { blocker: "invalid-name" };
      return {
        command: createRenameAttributeCommand(sole.node, action.index, action.name, sole.ancestors, action.coalesceKey),
      };
  }
}

/** Append `node` as the last child of `row` and reveal it. */
function appendChild(row: BulkRow, node: DocNode, edit: "name" | "value"): TreeActionPlan {
  return {
    command: createInsertNodeCommand(row.node, row.node.children.length, node, row.ancestors),
    select: [node.id],
    expand: row.node.id,
    edit,
  };
}

/** Insert as next sibling of `row`, or as its last child at the tab's visible root. */
function insertRelativeTo(row: BulkRow, node: DocNode, edit: "name" | "value"): TreeActionPlan | { blocker: TreeActionBlocker } {
  const plan = planInsertRelativeToRow(row);
  if (!plan) return { blocker: "no-selection" }; // stale row from an earlier render
  return {
    command: createInsertNodeCommand(plan.parent, plan.index, node, plan.parentAncestors),
    select: [node.id],
    expand: plan.insertedAsChild ? plan.parent.id : undefined,
    edit,
  };
}

/** Sibling slots sorted so that replacing them one after another stays correct: descending
 * index, so an earlier replacement never shifts a later one's index. */
function slotsDescending(rows: BulkRow[]): Array<NonNullable<ReturnType<typeof findSiblingSlot>>> {
  return rows
    .map((row) => findSiblingSlot(row))
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    .sort((a, b) => b.index - a.index);
}

/** One command stays itself; several become one undo step. */
function single(label: string, commands: Command[]): Command {
  return commands.length === 1 ? commands[0]! : createCompositeCommand(label, commands);
}
