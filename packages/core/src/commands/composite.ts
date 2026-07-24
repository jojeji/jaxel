import type { Command } from "./command.js";

/**
 * Groups several Commands into one undo step (executed in order, undone in reverse order).
 * `byteRangeChain` is the union of every sub-command's chain — CommandBus invalidates/
 * restores byteRange centrally based on this field (see command-bus.ts), so callers never
 * need to compute it themselves.
 */
export function createCompositeCommand(label: string, commands: Command[]): Command {
  return {
    label,
    byteRangeChain: commands.flatMap((command) => command.byteRangeChain),
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
