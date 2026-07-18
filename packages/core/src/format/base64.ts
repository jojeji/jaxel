/**
 * Base64 detection and decoding for the "Base64-Decode-Ansicht" (docs/entscheidungen.md
 * 2026-07-18): a cheap heuristic (`looksLikeBase64`) drives the clickable badge on visible
 * tree rows, the full decode (`decodeBase64`) happens only on demand. Environment-neutral
 * (no atob/Buffer) so it runs identically in the browser and in node-based tests.
 */

/** Values shorter than this never get the badge — short tokens ("Berlin", "P-1") would
 * otherwise constantly false-positive, and real embedded payloads are far longer. The manual
 * context-menu fallback ignores this limit (it calls decodeBase64 directly). */
const BADGE_MIN_LENGTH = 64;

const BASE64_SHAPE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Cheap plausibility check for the tree-row badge: length, alphabet, padding — no decode. */
export function looksLikeBase64(value: string | null | undefined): boolean {
  if (!value) return false;
  const compact = value.replace(/\s+/g, "");
  if (compact.length < BADGE_MIN_LENGTH || compact.length % 4 !== 0) return false;
  return BASE64_SHAPE.test(compact);
}

export type DecodedContentKind = "pdf" | "png" | "jpeg" | "gif" | "zip" | "gzip" | "text" | "binary";

export interface DecodedBase64 {
  bytes: Uint8Array;
  kind: DecodedContentKind;
  /** The decoded bytes as text — only when `kind` is "text" (valid UTF-8, no binary junk). */
  text: string | null;
  /** For text content: which of Jaxel's document formats it appears to be, if any. */
  textFormat: "xml" | "json" | null;
  /** File extension matching `kind`, for the temp-file/external-open path. */
  extension: string;
}

const EXTENSIONS: Record<DecodedContentKind, string> = {
  pdf: "pdf",
  png: "png",
  jpeg: "jpg",
  gif: "gif",
  zip: "zip",
  gzip: "gz",
  text: "txt",
  binary: "bin",
};

const B64_LOOKUP: Int16Array = (() => {
  const table = new Int16Array(128).fill(-1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
})();

function decodeBytes(compact: string): Uint8Array | null {
  const padding = compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0;
  const length = (compact.length / 4) * 3 - padding;
  const bytes = new Uint8Array(length);
  let out = 0;
  for (let i = 0; i < compact.length; i += 4) {
    let chunk = 0;
    let chars = 0;
    for (let j = 0; j < 4; j++) {
      const char = compact.charCodeAt(i + j);
      if (char === 61) break; // "=" padding
      const bits = char < 128 ? B64_LOOKUP[char]! : -1;
      if (bits === -1) return null;
      chunk = (chunk << 6) | bits;
      chars++;
    }
    chunk <<= (4 - chars) * 6;
    if (chars > 1 && out < length) bytes[out++] = (chunk >> 16) & 0xff;
    if (chars > 2 && out < length) bytes[out++] = (chunk >> 8) & 0xff;
    if (chars > 3 && out < length) bytes[out++] = chunk & 0xff;
  }
  return bytes;
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((byte, i) => bytes[i] === byte);
}

function sniffKind(bytes: Uint8Array): DecodedContentKind | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif"; // GIF8
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // PK
  if (startsWith(bytes, [0x1f, 0x8b])) return "gzip";
  return null;
}

function detectTextFormat(text: string): "xml" | "json" | null {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) return "xml";
  try {
    JSON.parse(trimmed);
    return "json";
  } catch {
    return null;
  }
}

/**
 * Decodes a base64 value (whitespace/newlines allowed, as typical for embedded payloads)
 * and classifies the content via magic bytes, falling back to a strict UTF-8 text check.
 * Returns null if the value is not valid base64 at all.
 */
export function decodeBase64(value: string): DecodedBase64 | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length === 0 || compact.length % 4 !== 0 || !BASE64_SHAPE.test(compact)) return null;
  const bytes = decodeBytes(compact);
  if (!bytes) return null;

  const sniffed = sniffKind(bytes);
  if (sniffed) {
    return { bytes, kind: sniffed, text: null, textFormat: null, extension: EXTENSIONS[sniffed] };
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Reject "text" full of control characters — that's binary that happens to be valid UTF-8.
    // eslint-disable-next-line no-control-regex
    const controlChars = text.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g)?.length ?? 0;
    if (controlChars === 0) {
      return { bytes, kind: "text", text, textFormat: detectTextFormat(text), extension: EXTENSIONS.text };
    }
  } catch {
    // not valid UTF-8 — fall through to binary
  }
  return { bytes, kind: "binary", text: null, textFormat: null, extension: EXTENSIONS.binary };
}
