import { isCommentedOutSubtree, type DocNode } from "../model/node.js";
import type { Command } from "./command.js";
import { findAncestorChain } from "../format/path.js";
import { planReplacements } from "../search/search.js";
import type { SearchOptions } from "../search/search.js";
import { createRenameCommand } from "./rename.js";
import { createSetValueCommand } from "./set-value.js";
import { createSetAttributeCommand } from "./set-attribute.js";
import { createCompositeCommand } from "./composite.js";

export interface ReplaceAllResult {
  /** `null` when nothing matched — nothing to execute, no empty no-op undo step. */
  command: Command | null;
  /** Total individual substring replacements across every touched field (for UI feedback;
   * not the same as the number of touched fields — one field can contain several). */
  replacementCount: number;
  /** Matches that were found but deliberately left alone because they sit inside a
   * commented-out subtree (docs/entscheidungen.md, "Grilling: Kommentare in XML" #6). Reported
   * so the UI can say so — silently skipping them would look like the search lied. */
  skippedInComments: number;
}

/**
 * Bulk find/replace as ONE undoable command (a composite, see composite.ts). `trueRoot` is
 * the whole document — ancestor chains for byteRange invalidation always trace from there,
 * see rename.ts. `searchRoot` narrows the SCOPE of the search/replace (e.g. a focused
 * subtree) without narrowing ancestor tracing (docs/entscheidungen.md 2026-07-18 #1).
 */
export function createReplaceAllCommand(
  trueRoot: DocNode,
  searchRoot: DocNode,
  options: SearchOptions,
  replacement: string,
): ReplaceAllResult {
  const plans = planReplacements(searchRoot, options, replacement);
  if (plans.length === 0) return { command: null, replacementCount: 0, skippedInComments: 0 };

  const commands: Command[] = [];
  let replacementCount = 0;
  let skippedInComments = 0;
  for (const plan of plans) {
    const ancestors = findAncestorChain(trueRoot, plan.node) ?? [];
    // Read-only cases, both reported rather than silently skipped:
    // - anything INSIDE a commented-out subtree — the file carries the comment's raw text, so
    //   rewriting its parsed view would be dropped on the next save;
    // - a replacement that would put "--" into a comment, which XML forbids and cannot escape.
    // A plain prose comment stays replaceable: it is editable by hand too (grilling #5/#6).
    // Both the contents of a commented-out subtree AND the comment node carrying them are
    // read-only; only a prose comment (no parsed children) may be rewritten.
    const insideComment =
      ancestors.some((a) => a.kind === "comment") || isCommentedOutSubtree(plan.node);
    const wouldBreakComment = plan.node.kind === "comment" && plan.kind === "value" && plan.after.includes("--");
    if (insideComment || wouldBreakComment) {
      skippedInComments += plan.count;
      continue;
    }
    replacementCount += plan.count;
    if (plan.kind === "name") {
      commands.push(createRenameCommand(plan.node, plan.after, ancestors));
    } else if (plan.kind === "value") {
      commands.push(createSetValueCommand(plan.node, plan.after, plan.node.jsonType, ancestors));
    } else if (plan.kind === "attribute" && plan.attributeName) {
      commands.push(createSetAttributeCommand(plan.node, plan.attributeName, plan.after, ancestors));
    }
  }

  // Every match sat in a read-only spot — no command, but the caller still needs to hear why.
  if (commands.length === 0) return { command: null, replacementCount: 0, skippedInComments };
  return { command: createCompositeCommand("replace-all", commands), replacementCount, skippedInComments };
}
