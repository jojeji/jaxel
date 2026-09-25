/**
 * XML character data (text content and attribute values) — the ONE place that decides how it
 * is read from and written back to markup, so import and export cannot disagree.
 *
 * Jaxel has no DTD support, so a reference to an entity it does not know (`&nbsp;`, `&c;`) cannot
 * be resolved. It is kept verbatim in the model instead, and — the other half of that promise —
 * written back verbatim. Hence the rule, symmetric in both directions:
 *
 *   An `&` that begins something shaped like an entity reference (`&name;`) stays as it is.
 *   Every other `&` is the character "&".
 *
 * Reading: the five predefined entities and numeric character references are decoded, EXCEPT an
 * escaped ampersand (`&amp;`, `&#38;`, `&#x26;`) that is itself followed by `name;`: decoding it
 * would turn the escaped plain text "&nbsp;" into something the writer takes for a real
 * reference. It is kept as `&amp;` — itself `&name;`-shaped, so the writer leaves it alone.
 * Writing: every `&` not beginning a `&name;` becomes `&amp;` (character references included: a
 * typed "&#65;" is text, not an "A").
 *
 * Accepted consequence: text a user TYPES that looks like an entity reference (e.g. "&x;") is
 * written as one.
 */

// Permissive name grammar, same allowance as the parser's element names (xml-import.ts).
const REFERENCE_NAME = "[A-Za-z_:\\u00C0-\\uFFFF][A-Za-z0-9_:.\\-\\u00C0-\\uFFFF]*";
const STARTS_REFERENCE = new RegExp(`^${REFERENCE_NAME};`);
const ENTITY_RE = /&(#[xX][0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g;
/** An `&` that does NOT begin an entity-reference-shaped `&name;`. */
const BARE_AMPERSAND = new RegExp(`&(?!${REFERENCE_NAME};)`, "g");

const PREDEFINED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Markup → model value (text content or attribute value). */
export function decodeCharData(markup: string): string {
  return markup.replace(ENTITY_RE, (match, body: string, offset: number) => {
    const predefined = PREDEFINED[body];
    let decoded: string;
    if (predefined !== undefined) {
      decoded = predefined;
    } else {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (Number.isNaN(code)) return match;
      decoded = String.fromCodePoint(code);
    }
    // An escaped "&" in front of "name;" stays escaped: see the module comment.
    if (decoded === "&" && STARTS_REFERENCE.test(markup.slice(offset + match.length))) return "&amp;";
    return decoded;
  });
}

/** Model value → text content markup. */
export function encodeText(value: string): string {
  return value.replace(BARE_AMPERSAND, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Model value → attribute value markup (inside double quotes). */
export function encodeAttribute(value: string): string {
  return value.replace(BARE_AMPERSAND, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
