import type { DocNode } from "../model/node.js";
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
  if (plans.length === 0) return { command: null, replacementCount: 0 };

  const commands: Command[] = [];
  let replacementCount = 0;
  for (const plan of plans) {
    replacementCount += plan.count;
    const ancestors = findAncestorChain(trueRoot, plan.node) ?? [];
    if (plan.kind === "name") {
      commands.push(createRenameCommand(plan.node, plan.after, ancestors));
    } else if (plan.kind === "value") {
      commands.push(createSetValueCommand(plan.node, plan.after, plan.node.jsonType, ancestors));
    } else if (plan.kind === "attribute" && plan.attributeName) {
      commands.push(createSetAttributeCommand(plan.node, plan.attributeName, plan.after, ancestors));
    }
  }

  return { command: createCompositeCommand("replace-all", commands), replacementCount };
}
