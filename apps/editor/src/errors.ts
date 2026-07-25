import { InvalidXmlNameError } from "@jaxel/core";

/** Turns an unknown `catch`/rejection value into a user-facing message (e.g. for a Toast) —
 * no stack trace, unlike logging.ts's `describeError`, which serves the crash-log bridge
 * instead and deliberately keeps that concern separate (see docs/entscheidungen.md AP15 #3). */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Message for a failed XML/JSON conversion. `InvalidXmlNameError` carries the offending key
 * and its location as data rather than a finished sentence, so the phrasing can be picked in
 * the user's language here instead of being baked into the core module.
 */
export function conversionErrorMessage(err: unknown, t: (key: string) => string): string {
  if (!(err instanceof InvalidXmlNameError)) return toErrorMessage(err);
  return err.path
    ? t("convert.invalidNameAt").replace("{key}", err.key).replace("{path}", err.path)
    : t("convert.invalidName").replace("{key}", err.key);
}
