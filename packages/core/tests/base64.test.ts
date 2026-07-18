import { describe, expect, it } from "vitest";
import { decodeBase64, looksLikeBase64 } from "../src/format/base64.js";

function toBase64(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return Buffer.from(bytes).toString("base64");
}

const LONG_XML = `<hello attr="x">${"a".repeat(60)}</hello>`;

describe("looksLikeBase64 (Badge-Heuristik)", () => {
  it("erkennt lange gültige Base64-Werte, auch mit Zeilenumbrüchen", () => {
    const encoded = toBase64(LONG_XML);
    expect(looksLikeBase64(encoded)).toBe(true);
    const wrapped = encoded.replace(/(.{20})/g, "$1\n");
    expect(looksLikeBase64(wrapped)).toBe(true);
  });

  it("lehnt kurze Werte ab (Mindestlänge), selbst wenn sie formal Base64 wären", () => {
    expect(looksLikeBase64("QmVybGlu")).toBe(false); // "Berlin"
    expect(looksLikeBase64("")).toBe(false);
    expect(looksLikeBase64(null)).toBe(false);
  });

  it("lehnt falsches Alphabet und falsche Länge ab", () => {
    expect(looksLikeBase64("ä".repeat(64))).toBe(false);
    expect(looksLikeBase64("A".repeat(65))).toBe(false); // nicht durch 4 teilbar
  });
});

describe("decodeBase64", () => {
  it("dekodiert Text und erkennt XML-Inhalt", () => {
    const decoded = decodeBase64(toBase64(LONG_XML));
    expect(decoded).not.toBeNull();
    expect(decoded!.kind).toBe("text");
    expect(decoded!.text).toBe(LONG_XML);
    expect(decoded!.textFormat).toBe("xml");
  });

  it("erkennt JSON-Inhalt", () => {
    const decoded = decodeBase64(toBase64('{"name": "Anna", "city": "Berlin"}'));
    expect(decoded!.kind).toBe("text");
    expect(decoded!.textFormat).toBe("json");
  });

  it("Freitext bleibt Text ohne Format", () => {
    const decoded = decodeBase64(toBase64("Nur ein ganz normaler Satz mit Umlauten: äöü."));
    expect(decoded!.kind).toBe("text");
    expect(decoded!.textFormat).toBeNull();
  });

  it("erkennt PDF an den Magic Bytes", () => {
    const decoded = decodeBase64(toBase64("%PDF-1.7\nirgendwas binäres dahinter"));
    expect(decoded!.kind).toBe("pdf");
    expect(decoded!.extension).toBe("pdf");
    expect(decoded!.text).toBeNull();
  });

  it("erkennt PNG an den Magic Bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    expect(decodeBase64(toBase64(png))!.kind).toBe("png");
  });

  it("nicht-UTF-8-Binärdaten ohne bekannten Header werden 'binary'", () => {
    const junk = new Uint8Array([0x00, 0xfe, 0xba, 0xad, 0xf0, 0x0d, 0xff, 0xff]);
    const decoded = decodeBase64(toBase64(junk));
    expect(decoded!.kind).toBe("binary");
    expect(decoded!.extension).toBe("bin");
  });

  it("dekodiert auch mit Whitespace/Zeilenumbrüchen im Wert", () => {
    const wrapped = toBase64(LONG_XML).replace(/(.{16})/g, "$1\r\n  ");
    expect(decodeBase64(wrapped)!.text).toBe(LONG_XML);
  });

  it("liefert null für ungültiges Base64", () => {
    expect(decodeBase64("das ist kein base64!")).toBeNull();
    expect(decodeBase64("AAA")).toBeNull(); // Länge nicht durch 4 teilbar
    expect(decodeBase64("")).toBeNull();
  });

  it("Roundtrip: dekodierte Bytes entsprechen dem Original", () => {
    const original = new Uint8Array([0, 1, 2, 253, 254, 255, 128, 64]);
    expect(Array.from(decodeBase64(toBase64(original))!.bytes)).toEqual(Array.from(original));
  });
});
