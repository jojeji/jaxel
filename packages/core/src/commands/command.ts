import type { JaxelDocument } from "../model/document.js";

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
  do(doc: JaxelDocument): void;
  undo(doc: JaxelDocument): void;
}
