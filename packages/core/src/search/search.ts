/**
 * Search and (planned) replace over a DocNode tree. `planReplacements` never mutates the
 * tree — it only computes what WOULD change; turning that plan into a real undoable
 * Command is `createReplaceAllCommand` (see ../commands/replace-all.ts), which is also
 * where byteRange invalidation happens (via CommandBus, same as every other mutation).
 */

import type { DocNode } from "../model/node.js";

export type SearchScope = "name" | "value" | "attribute" | "all";

export interface SearchOptions {
  query: string;
  scope: SearchScope;
  caseSensitive: boolean;
  useRegex: boolean;
}

export interface SearchMatch {
  node: DocNode;
  /** Set only when `matchedIn` is "attribute": the name of the matched attribute. */
  attributeName?: string;
  /** Which part of the node matched. */
  matchedIn: "name" | "value" | "attribute";
}

/**
 * A compiled matcher for one search pass. Built once before traversal so that regex
 * compilation (or case-folding) doesn't repeat per node.
 */
interface CompiledMatcher {
  /** True if `text` contains a match. */
  test(text: string): boolean;
  /**
   * Replaces every match in `text` with `replacement`, returning the new text and the
   * number of replacements made. Backreferences (e.g. "$1") are honored when the matcher
   * is regex-based, per JS String.replace semantics.
   */
  replace(text: string, replacement: string): { result: string; count: number };
}

function compileMatcher(options: SearchOptions): CompiledMatcher {
  if (options.useRegex) {
    let regex: RegExp;
    try {
      const flags = options.caseSensitive ? "g" : "gi";
      regex = new RegExp(options.query, flags);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid search regex "${options.query}": ${reason}`);
    }
    return {
      test(text: string): boolean {
        // Reset lastIndex since `regex` carries the "g" flag and is reused across calls.
        regex.lastIndex = 0;
        return regex.test(text);
      },
      replace(text: string, replacement: string): { result: string; count: number } {
        // Native String.replace already expands "$1"/"$&"/"$$"/etc. correctly per match when
        // given a global regex and a replacement *string* — no need to hand-roll that here.
        regex.lastIndex = 0;
        const count = text.match(regex)?.length ?? 0;
        regex.lastIndex = 0;
        const result = text.replace(regex, replacement);
        return { result, count };
      },
    };
  }

  const query = options.caseSensitive ? options.query : options.query.toLowerCase();

  return {
    test(text: string): boolean {
      const haystack = options.caseSensitive ? text : text.toLowerCase();
      return query.length > 0 && haystack.includes(query);
    },
    replace(text: string, replacement: string): { result: string; count: number } {
      if (query.length === 0) {
        return { result: text, count: 0 };
      }
      const haystack = options.caseSensitive ? text : text.toLowerCase();
      let count = 0;
      let result = "";
      let searchFrom = 0;
      let idx = haystack.indexOf(query, searchFrom);
      while (idx !== -1) {
        result += text.slice(searchFrom, idx) + replacement;
        searchFrom = idx + query.length;
        count++;
        idx = haystack.indexOf(query, searchFrom);
      }
      result += text.slice(searchFrom);
      return { result, count };
    },
  };
}

/**
 * The value a search should look at. For a commented-out subtree that is NOT its raw text:
 * the same content is already visible as parsed child nodes, and searching both would report
 * every match twice — once against an unreadable one-line blob, once at its real path.
 * A prose comment has no children, so its text stays searchable (grilling #6).
 */
function searchableValueOf(node: DocNode): string | null {
  if (node.kind === "comment" && node.children.length > 0) return null;
  return node.value;
}

function includesName(scope: SearchScope): boolean {
  return scope === "name" || scope === "all";
}

function includesValue(scope: SearchScope): boolean {
  return scope === "value" || scope === "all";
}

function includesAttribute(scope: SearchScope): boolean {
  return scope === "attribute" || scope === "all";
}

/**
 * Depth-first traversal (ancestors before descendants, children in array order), invoking
 * `visit` for every node.
 */
function walk(node: DocNode, visit: (node: DocNode) => void): void {
  visit(node);
  for (const child of node.children) {
    walk(child, visit);
  }
}

export function findAll(root: DocNode, options: SearchOptions): SearchMatch[] {
  const matcher = compileMatcher(options);
  const matches: SearchMatch[] = [];

  walk(root, (node) => {
    if (includesName(options.scope) && matcher.test(node.name)) {
      matches.push({ node, matchedIn: "name" });
    }
    if (includesValue(options.scope) && searchableValueOf(node) !== null && matcher.test(searchableValueOf(node)!)) {
      matches.push({ node, matchedIn: "value" });
    }
    if (includesAttribute(options.scope)) {
      for (const attr of node.attributes) {
        if (matcher.test(attr.value)) {
          matches.push({ node, attributeName: attr.name, matchedIn: "attribute" });
        }
      }
    }
  });

  return matches;
}

export interface PlannedReplacement {
  node: DocNode;
  kind: "name" | "value" | "attribute";
  /** Set only when `kind` is "attribute": the name of the matched attribute. */
  attributeName?: string;
  before: string;
  after: string;
  /** Number of individual substring replacements within this one field. */
  count: number;
}

/**
 * Computes what a bulk find/replace over `root` WOULD change, without mutating anything.
 * `createReplaceAllCommand` (../commands/replace-all.ts) turns each entry into a real,
 * undoable Command.
 */
export function planReplacements(root: DocNode, options: SearchOptions, replacement: string): PlannedReplacement[] {
  const matcher = compileMatcher(options);
  const plans: PlannedReplacement[] = [];

  walk(root, (node) => {
    if (includesName(options.scope)) {
      const { result, count } = matcher.replace(node.name, replacement);
      if (count > 0) {
        plans.push({ node, kind: "name", before: node.name, after: result, count });
      }
    }
    const searchableValue = includesValue(options.scope) ? searchableValueOf(node) : null;
    if (searchableValue !== null) {
      const { result, count } = matcher.replace(searchableValue, replacement);
      if (count > 0) {
        plans.push({ node, kind: "value", before: searchableValue, after: result, count });
      }
    }
    if (includesAttribute(options.scope)) {
      for (const attr of node.attributes) {
        const { result, count } = matcher.replace(attr.value, replacement);
        if (count > 0) {
          plans.push({ node, kind: "attribute", attributeName: attr.name, before: attr.value, after: result, count });
        }
      }
    }
  });

  return plans;
}
