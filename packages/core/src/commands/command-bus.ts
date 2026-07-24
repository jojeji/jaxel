import type { JaxelDocument } from "../model/document.js";
import type { DocNode } from "../model/node.js";
import type { Command } from "./command.js";
import { captureByteRanges, clearByteRanges, restoreByteRanges } from "./byte-range.js";

interface ByteRangeSnapshot {
  /** `saveEpoch` at capture time — see `markSaved`. */
  epoch: number;
  ranges: DocNode["byteRange"][];
}

/**
 * Owns a JaxelDocument's undo/redo history. `doc.revision` is bumped on every executed,
 * undone, or redone command so React can re-derive its view without a parallel data model.
 *
 * Also owns ALL byteRange invalidation/restoration for `Command.byteRangeChain` (commands
 * themselves only perform their raw mutation — see docs/entscheidungen.md "Save-Epoche"):
 * before a command's first do(), its chain's CURRENT byteRanges are captured (stamped with
 * the current `saveEpoch`); after do()/redo(), the chain is cleared; on undo(), the captured
 * ranges are restored ONLY if no save happened since capture (`epoch` still matches) — a
 * byteRange captured before a save is invalid the moment minimal-invasive save's reference
 * text changes, so restoring it verbatim would corrupt the NEXT save instead of just leaving
 * the node to be freshly rebuilt from the model (safe).
 */
export class CommandBus {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly listeners = new Set<() => void>();
  /** Undo-stack depth at the last save — the dirty baseline (see `isDirty`). Starts at 0, so
   * a freshly loaded/created document (empty stack) is clean until its first command. */
  private savedDepth = 0;
  /** Bumped by every `markSaved()`. See the class doc comment ("Save-Epoche"). */
  private saveEpoch = 0;
  private readonly byteRangeSnapshots = new WeakMap<Command, ByteRangeSnapshot>();

  constructor(private readonly doc: JaxelDocument) {}

  getDocument(): JaxelDocument {
    return this.doc;
  }

  execute(command: Command): void {
    const previous = this.undoStack[this.undoStack.length - 1];
    const isCoalesce = command.coalesceKey !== undefined && previous?.coalesceKey === command.coalesceKey;

    let stackEntry: Command;
    if (isCoalesce) {
      // Merge with the previous entry (which already ran — only bookkeeping changes):
      // one undo step for a whole per-keystroke editing chain. See Command.coalesceKey.
      const merged: Command = {
        label: command.label,
        coalesceKey: command.coalesceKey,
        byteRangeChain: command.byteRangeChain,
        do: (doc) => {
          previous.do(doc);
          command.do(doc);
        },
        undo: (doc) => {
          command.undo(doc);
          previous.undo(doc);
        },
      };
      // The snapshot belongs to the WHOLE chain (captured before its first keystroke), not
      // to this individual increment — inherit it instead of capturing the ALREADY-cleared
      // current byteRange as if it were the "before" state.
      const inherited = this.byteRangeSnapshots.get(previous);
      if (inherited) this.byteRangeSnapshots.set(merged, inherited);
      stackEntry = merged;
    } else {
      this.byteRangeSnapshots.set(command, {
        epoch: this.saveEpoch,
        ranges: captureByteRanges(command.byteRangeChain),
      });
      stackEntry = command;
    }

    command.do(this.doc);
    clearByteRanges(command.byteRangeChain);
    this.doc.revision++;

    if (isCoalesce) {
      this.undoStack[this.undoStack.length - 1] = stackEntry;
    } else {
      this.undoStack.push(stackEntry);
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
    // Always clear first: whatever byteRange the chain carried belonged to the PRE-undo
    // value, which undo() above just changed — that byteRange is wrong now regardless of
    // epoch. Only reinstate the captured "before" byteRange if it's provably still valid
    // for the CURRENT source text (no save happened since it was captured).
    clearByteRanges(command.byteRangeChain);
    const snapshot = this.byteRangeSnapshots.get(command);
    if (snapshot && snapshot.epoch === this.saveEpoch) {
      restoreByteRanges(command.byteRangeChain, snapshot.ranges);
    }
    this.redoStack.push(command);
    this.notify();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.do(this.doc);
    clearByteRanges(command.byteRangeChain);
    this.doc.revision++;
    this.undoStack.push(command);
    this.notify();
  }

  /** Call once the document's current state has been written to disk: the undo-stack depth
   * right now becomes the new "clean" baseline, and any byteRange snapshot captured before
   * this point becomes unsafe to restore (see the class doc comment). */
  markSaved(): void {
    this.savedDepth = this.undoStack.length;
    this.saveEpoch++;
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
