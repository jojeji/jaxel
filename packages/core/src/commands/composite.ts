import type { Command } from "./command.js";

/** Groups several Commands into one undo step (executed in order, undone in reverse order). */
export function createCompositeCommand(label: string, commands: Command[]): Command {
  return {
    label,
    do(doc) {
      for (const command of commands) command.do(doc);
    },
    undo(doc) {
      for (let i = commands.length - 1; i >= 0; i--) {
        commands[i]!.undo(doc);
      }
    },
  };
}
