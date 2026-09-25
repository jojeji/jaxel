import { describe, expect, it } from "vitest";
import { hostErrorMessage, toErrorMessage } from "./errors.js";
import de from "./i18n/de.json";
import en from "./i18n/en.json";

describe("toErrorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies a non-Error thrown value", () => {
    expect(toErrorMessage("plain string")).toBe("plain string");
    expect(toErrorMessage(42)).toBe("42");
  });
});

describe("hostErrorMessage", () => {
  const catalog: Record<string, string> = {
    "error.openFailed": "Öffnen fehlgeschlagen: {detail}",
    "vscode.pdfOnly": "Nur PDF-Inhalte können an VS Code übergeben werden.",
  };
  const t = (key: string): string => catalog[key] ?? key;

  it("übersetzt einen Fehlercode aus dem Backend und setzt das Detail ein", () => {
    expect(hostErrorMessage("error.openFailed|kein Programm", t)).toBe("Öffnen fehlgeschlagen: kein Programm");
    expect(hostErrorMessage(new Error("vscode.pdfOnly|"), t)).toBe("Nur PDF-Inhalte können an VS Code übergeben werden.");
  });

  it("lässt gewöhnliche Fehlermeldungen unverändert", () => {
    expect(hostErrorMessage("Datei nicht gefunden", t)).toBe("Datei nicht gefunden");
    expect(hostErrorMessage("unbekannt.code|x", t)).toBe("unbekannt.code|x");
  });

  it("kennt jeden Code, den Backend und Host verwenden, in beiden Sprachen", () => {
    const codes = [
      "error.noParentFolder",
      "error.openFolderFailed",
      "error.invalidBase64",
      "error.tempFileFailed",
      "error.openFailed",
      "error.logDirUnknown",
      "vscode.pdfOnly",
      "vscode.noLog",
    ];
    for (const catalogJson of [de, en] as Array<Record<string, string>>) {
      for (const code of codes) expect(catalogJson[code], code).toBeTruthy();
    }
  });
});
