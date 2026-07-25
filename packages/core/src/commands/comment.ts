/**
 * Commenting a node out and back in (docs/entscheidungen.md, "Grilling: Kommentare in XML").
 *
 * Both directions are a swap in place: the node at index N is replaced by its commented form
 * and vice versa. That is only possible because comments live in `children` like any other
 * node — no separate list, no anchor bookkeeping.
 */

import { createCommentNode, type DocNode } from "../model/node.js";
import { serializeXml } from "../format/xml-export.js";
import type { Command } from "./command.js";

/**
 * Why a node cannot be commented out, or null if it can. XML forbids `--` inside a comment and
 * has no nesting, so any subtree already containing a comment — or a literal `--` in text or an
 * attribute — has no valid commented form. Escaping is not an option: XML resolves no entities
 * inside comments, so `&#45;&#45;` would come back out literally.
 */
export type CommentOutBlocker = "contains-comment" | "contains-double-hyphen";

export function commentOutBlocker(node: DocNode): CommentOutBlocker | null {
  if (containsComment(node)) return "contains-comment";
  if (containsDoubleHyphen(node)) return "contains-double-hyphen";
  return null;
}

function containsComment(node: DocNode): boolean {
  if (node.kind === "comment") return true;
  return node.children.some(containsComment);
}

function containsDoubleHyphen(node: DocNode): boolean {
  if (node.name.includes("--")) return true;
  if (node.value !== null && node.value.includes("--")) return true;
  if (node.attributes.some((a) => a.name.includes("--") || a.value.includes("--"))) return true;
  return node.children.some(containsDoubleHyphen);
}

/**
 * Replaces `parent.children[index]` with a comment holding that node's serialized XML.
 * Returns null when the node has no valid commented form (see `commentOutBlocker`) — callers
 * are expected to have disabled the action already, this is the last line of defence.
 *
 * `parentAncestors` is the chain from the root to `parent`'s own parent, `parent` excluded —
 * same contract as the other mutation commands.
 */
export function createCommentOutCommand(
  parent: DocNode,
  index: number,
  parentAncestors: DocNode[],
  indent: string,
): Command | null {
  const original = parent.children[index];
  if (!original || original.kind === "comment") return null;
  if (commentOutBlocker(original) !== null) return null;

  // Serialized without a byte source: the commented text must come from the model, not from
  // original file bytes, so a node edited before being commented out carries its new state.
  const markup = serializeXml({ root: original, indent }).trimEnd();
  // The spaces keep `<!--<a/>-->` from reading as one run-on token, and match what a person
  // would type by hand.
  const commented = createCommentNode({ text: ` ${markup} `, children: [original] });

  return {
    label: "comment-out",
    byteRangeChain: [...parentAncestors, parent],
    do() {
      parent.children[index] = commented;
    },
    undo() {
      parent.children[index] = original;
    },
  };
}

/**
 * Turns a commented-out subtree back into live nodes. Returns null for a prose comment, whose
 * text is not markup and therefore has nothing to restore.
 *
 * A comment can hold several sibling elements (`<!-- <a/><b/> -->`), so this replaces one child
 * with possibly several — which is also why it cannot simply mirror `createCommentOutCommand`.
 */
export function createUncommentCommand(
  parent: DocNode,
  index: number,
  parentAncestors: DocNode[],
): Command | null {
  const comment = parent.children[index];
  if (!comment || comment.kind !== "comment" || comment.children.length === 0) return null;
  const restored = comment.children;

  return {
    label: "uncomment",
    byteRangeChain: [...parentAncestors, parent],
    do() {
      parent.children.splice(index, 1, ...restored);
    },
    undo() {
      parent.children.splice(index, restored.length, comment);
    },
  };
}
