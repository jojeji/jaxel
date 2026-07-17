/**
 * Search and replace over a DocNode tree.
 *
 * This module is intentionally command-bus-agnostic: `replaceAll` mutates matched nodes
 * directly. Wrapping that mutation in an undoable Command is left to the caller (see
 * docs/architektur.md — every user-visible mutation eventually needs to go through the
 * CommandBus, but that wiring happens elsewhere). It does, however, clear a mutated node's
 * `byteRange` (same convention as the commands in ../commands): minimal-invasive save
 * copies unchanged nodes verbatim from source bytes, so a stale byteRange on a
 * replaced node would silently discard the replacement on save.
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
    if (includesValue(options.scope) && node.value !== null && matcher.test(node.value)) {
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

export function replaceAll(root: DocNode, options: SearchOptions, replacement: string): number {
  const matcher = compileMatcher(options);
  let totalReplacements = 0;

  walk(root, (node) => {
    if (includesName(options.scope)) {
      const { result, count } = matcher.replace(node.name, replacement);
      if (count > 0) {
        node.name = result;
        node.byteRange = undefined;
        totalReplacements += count;
      }
    }
    if (includesValue(options.scope) && node.value !== null) {
      const { result, count } = matcher.replace(node.value, replacement);
      if (count > 0) {
        node.value = result;
        node.byteRange = undefined;
        totalReplacements += count;
      }
    }
    if (includesAttribute(options.scope)) {
      for (const attr of node.attributes) {
        const { result, count } = matcher.replace(attr.value, replacement);
        if (count > 0) {
          attr.value = result;
          node.byteRange = undefined;
          totalReplacements += count;
        }
      }
    }
  });

  return totalReplacements;
}
