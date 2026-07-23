import type { JaxelDocument } from "../model/document.js";
import type { Command } from "./command.js";

/**
 * Owns a JaxelDocument's undo/redo history. `doc.revision` is bumped on every executed,
 * undone, or redone command so React can re-derive its view without a parallel data model.
 */
export class CommandBus {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly listeners = new Set<() => void>();
  /** Undo-stack depth at the last save — the dirty baseline (see `isDirty`). Starts at 0, so
   * a freshly loaded/created document (empty stack) is clean until its first command. */
  private savedDepth = 0;

  constructor(private readonly doc: JaxelDocument) {}

  getDocument(): JaxelDocument {
    return this.doc;
  }

  execute(command: Command): void {
    command.do(this.doc);
    this.doc.revision++;
    const previous = this.undoStack[this.undoStack.length - 1];
    if (command.coalesceKey !== undefined && previous?.coalesceKey === command.coalesceKey) {
      // Merge with the previous entry (which already ran — only bookkeeping changes):
      // one undo step for a whole per-keystroke editing chain. See Command.coalesceKey.
      this.undoStack[this.undoStack.length - 1] = {
        label: command.label,
        coalesceKey: command.coalesceKey,
        do: (doc) => {
          previous.do(doc);
          command.do(doc);
        },
        undo: (doc) => {
          command.undo(doc);
          previous.undo(doc);
        },
      };
    } else {
      this.undoStack.push(command);
    }
    this.redoStack.length = 0;
    this.notify();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo(this.doc);
    this.doc.revision++;
    this.redoStack.push(command);
    this.notify();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.do(this.doc);
    this.doc.revision++;
    this.undoStack.push(command);
    this.notify();
  }

  /** Call once the document's current state has been written to disk: the undo-stack depth
   * right now becomes the new "clean" baseline. */
  markSaved(): void {
    this.savedDepth = this.undoStack.length;
  }

  /** True iff the undo-stack depth has moved away from the saved baseline — i.e. there are
   * changes not reflected on disk. Undoing back down to exactly the saved depth (even without
   * saving again) makes this false again; see CONTEXT.md "Baseline". Note: this is a stack-
   * depth comparison, not a content diff — after saving and then undoing/redoing through a
   * DIFFERENT branch of edits (redo history is cleared by any new command, see `execute`), the
   * depth could coincidentally match the baseline again despite different content. Same
   * trade-off most editors with undo-based dirty tracking accept. */
  isDirty(): boolean {
    return this.undoStack.length !== this.savedDepth;
  }

  /** For React (or any UI) to re-render after a mutation. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
