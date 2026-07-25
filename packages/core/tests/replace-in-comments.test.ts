import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import type { SearchOptions } from "../src/search/search.js";

const OPTIONS: SearchOptions = { query: "Anna", scope: "all", caseSensitive: true, useRegex: false };

/**
 * Grilling-Entscheidung #6: Auskommentierte Teilbäume werden gefunden, aber nicht ersetzt —
 * die Datei trägt den Rohtext des Kommentars, eine Änderung an der geparsten Ansicht wäre beim
 * nächsten Speichern verloren. Übersprungene Treffer werden gemeldet, nicht verschwiegen.
 */
describe("Alle ersetzen und Kommentare", () => {
  it("lässt Treffer in einem auskommentierten Teilbaum unangetastet", () => {
    const source = "<catalog><name>Anna</name><!-- <alt><name>Anna</name></alt> --></catalog>";
    const { root } = parseXml(source);
    const bus = new CommandBus(createDocument({ format: "xml", root }));

    const result = createReplaceAllCommand(root, root, OPTIONS, "Bert");
    expect(result.replacementCount).toBe(1);
    expect(result.skippedInComments).toBe(1);

    bus.execute(result.command!);
    const out = serializeXml({ root, indent: "" });
    expect(out).toContain("<name>Bert</name>");
    // Der Kommentar steht unverändert in der Datei.
    expect(out).toContain("<!-- <alt><name>Anna</name></alt> -->");
  });

  it("ersetzt in einem gewöhnlichen Prosa-Kommentar", () => {
    // Prosa-Kommentare sind von Hand editierbar, also auch ersetzbar.
    const { root } = parseXml("<catalog><!-- Anna prüfen --></catalog>");
    const bus = new CommandBus(createDocument({ format: "xml", root }));

    const result = createReplaceAllCommand(root, root, OPTIONS, "Bert");
    expect(result.skippedInComments).toBe(0);
    bus.execute(result.command!);
    expect(serializeXml({ root, indent: "" })).toContain("<!-- Bert prüfen -->");
  });

  it("überspringt eine Ersetzung, die -- in einen Kommentar schreiben würde", () => {
    const { root } = parseXml("<catalog><!-- Anna prüfen --></catalog>");
    const result = createReplaceAllCommand(root, root, OPTIONS, "A--B");

    expect(result.command).toBeNull();
    expect(result.replacementCount).toBe(0);
    expect(result.skippedInComments).toBe(1);
    // Der Kommentar bleibt gültiges XML.
    expect(serializeXml({ root, indent: "" })).toContain("<!-- Anna prüfen -->");
  });

  it("meldet auch dann, wenn ALLE Treffer übersprungen wurden", () => {
    const { root } = parseXml("<catalog><!-- <a><name>Anna</name></a> --></catalog>");
    const result = createReplaceAllCommand(root, root, OPTIONS, "Bert");

    expect(result.command).toBeNull();
    expect(result.skippedInComments).toBeGreaterThan(0);
  });
});
