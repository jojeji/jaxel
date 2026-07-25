/** Turns an unknown `catch`/rejection value into a user-facing message (e.g. for a Toast) —
 * no stack trace, unlike logging.ts's `describeError`, which serves the crash-log bridge
 * instead and deliberately keeps that concern separate (see docs/entscheidungen.md AP15 #3). */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
