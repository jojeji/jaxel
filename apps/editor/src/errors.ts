import { InvalidXmlNameError } from "@jaxel/core";

/** Turns an unknown `catch`/rejection value into a user-facing message (e.g. for a Toast) —
 * no stack trace, unlike logging.ts's `describeError`, which serves the crash-log bridge
 * instead and deliberately keeps that concern separate (see docs/entscheidungen.md AP15 #3). */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Message for an error from the backend or the VS Code host. Those report a stable code instead
 * of a finished sentence — `"<i18n key>|<detail>"`, e.g. `"error.openFailed|<OS message>"` — so
 * the phrasing is picked in the user's language here (CLAUDE.md invariant #7). Anything else
 * (an unknown code, a plain message) is shown unchanged.
 */
export function hostErrorMessage(err: unknown, t: (key: string) => string): string {
  const message = toErrorMessage(err);
  const separator = message.indexOf("|");
  if (separator <= 0) return message;
  const code = message.slice(0, separator);
  const template = t(code);
  if (template === code) return message; // not a known code
  return template.replace("{detail}", message.slice(separator + 1));
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
