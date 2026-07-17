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

  constructor(private readonly doc: JaxelDocument) {}

  getDocument(): JaxelDocument {
    return this.doc;
  }

  execute(command: Command): void {
    command.do(this.doc);
    this.doc.revision++;
    this.undoStack.push(command);
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

  /** For React (or any UI) to re-render after a mutation. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
