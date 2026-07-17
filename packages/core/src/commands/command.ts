import type { JaxelDocument } from "../model/document.js";

/**
 * A single undoable mutation. One visible user step = one Command (use composite.ts to
 * group several low-level edits into one undo step when needed).
 */
export interface Command {
  readonly label: string;
  do(doc: JaxelDocument): void;
  undo(doc: JaxelDocument): void;
}
