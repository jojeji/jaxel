import type { JaxelDocument } from "../model/document.js";
import type { DocNode } from "../model/node.js";

/**
 * A single undoable mutation. One visible user step = one Command (use composite.ts to
 * group several low-level edits into one undo step when needed).
 */
export interface Command {
  readonly label: string;
  /**
   * When set, CommandBus.execute merges this command with the previous undo-stack entry
   * if that entry carries the SAME key — per-keystroke edits of one field (live attribute
   * typing) collapse into one undo step instead of one step per character. Any command
   * with a different (or no) key breaks the chain.
   */
  readonly coalesceKey?: string;
  /**
   * Every node whose `byteRange` must be invalidated when this command runs — root first,
   * the actually-mutated node(s) last (see commands/byte-range.ts). A required field, not
   * optional: CommandBus owns byteRange invalidation/restoration entirely (including the
   * save-epoch check that keeps a stale byteRange from surviving a save across an undo —
   * docs/entscheidungen.md "Save-Epoche"), so every command must state its chain explicitly.
   * Pass `[]` for a command that touches no existing node's byteRange.
   */
  readonly byteRangeChain: DocNode[];
  do(doc: JaxelDocument): void;
  undo(doc: JaxelDocument): void;
}
