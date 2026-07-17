# Jaxel — plattformunabhängiger XML/JSON-Editor

> Arbeitstitel **Jaxel** (JSON + XML, Binärname `jaxel`). Slogan: „Ein Baum, zwei Formate."
> Optionaler Maskottchen-Flavor später: *Jaxolotl* (Axolotl). Name ist trivial umbenennbar und blockiert nichts.

## Context

Der User braucht einen Ersatz für **Easy XML Editor**, den es nicht für Linux gibt. Ziel ist eine
plattformunabhängige Desktop-App (Linux + Windows Pflicht, macOS optional), sowohl **installierbar als
auch portabel**. Kernnutzen: große XML-Dateien (mehrere 100 MB) komfortabel als kompakten Knotenbaum
anzeigen und editieren, XML **und** JSON quasi identisch darstellen, mit Suchen/Ersetzen, Pfad-Kopieren
und schnellem Inline-Editieren. Als Design- und Architektur-Referenz dient das Schwesterprojekt
`xdp-designer` (gleiche Firma): Tauri 2 + React + TypeScript, dunkles Navy/Teal-Theme, npm-Workspaces,
„geparster Baum = einzige Wahrheit", jede Mutation als Command mit Undo/Redo.

Die Screenshots (`2026-07-17_12-39.png`, `2026-07-17_12-40.png`) zeigen das Easy-XML-Layout als
visuelle Orientierung: linke Baumansicht mit inline Name/Text, rechte Bearbeiten-Panels
(Name/Text/Attribute), untere Tabellenansicht der Kindknoten, Kontextmenü mit Knoten-Operationen.

## Getroffene Entscheidungen (aus dem Grilling)

| Thema | Entscheidung |
|---|---|
| **Round-Trip** | Format-erhaltend *best effort*: unveränderte Bereiche byte-identisch (Kommentare, PIs, CDATA, Attributreihenfolge, Whitespace), nur geänderte Knoten werden nach konfigurierbarer Einrückungsregel neu geschrieben. **Kein** hartes Byte-Identität-Invariant wie bei xdp-designer. |
| **Stack** | Tauri 2 + Rust-Kern (Parser/Index/Suche/IO) + React 18 + TypeScript + Vite. Node 18. |
| **Große Dateien** | Streaming-Parse (quick-xml) → leichter Index (Byte-Offsets + Knoten-Metadaten), ganze Datei im RAM, virtualisierte Baumansicht. Kein >RAM-Editing. |
| **XML/JSON-Modell** | Eigene einfache Konvention. Gemeinsames Node-Modell `{name, attributes[], value, children[]}`. JSON-Objekt→Knoten je Property, JSON-Array→gleichnamige Kindknoten (⇒ indizierter Pfad `a.b[0].c`), Primitive→value. |
| **Multi-Window** | Tabs als Standard, echte OS-Fenster via Einstellung optional. |
| **Namespaces** | V1 erhält Namespaces korrekt (xmlns als Attribut, Prefixe bleiben). Dedizierter Verwaltungs-Dialog später. |
| **Plattform-Reihenfolge** | Linux zuerst, dann Windows, macOS optional zuletzt. |
| **Pakete** | Linux: AppImage (portabel) + .deb/.rpm. Windows: portable .exe + .msi/NSIS. |
| **Kodierung** | UTF-8/UTF-16 (BOM) + Auto-Erkennung von ISO-8859-1/Windows-1252 via XML-Deklaration (`encoding_rs`). Ursprungskodierung beim Speichern beibehalten. |
| **Validierung** | Keine XSD/DTD-Validierung (auch nicht später). |
| **Sprache** | i18n von Anfang an: **Deutsch + Englisch**. |

## Toolchain (verifiziert vorhanden)

Node v18.19.1, npm 9.2.0, rustc 1.97.0, cargo 1.97.0, webkit2gtk-4.1 (2.52.3), gcc/cc, git. → Tauri 2 baut lokal ohne Blocker.

---

## Architektur

Monorepo mit npm-Workspaces, gespiegelt an xdp-designer:

```
xml-editor/
  package.json                # workspaces: packages/*, apps/*
  docs/                       # SELBST-DOKU (Pflicht, s.u.)
    architektur.md
    entscheidungen.md         # Entscheidungslog (Grilling-Ergebnisse + spätere)
    status.md                 # Ist-Stand je Arbeitspaket
    benutzerhandbuch.md
  packages/
    core/                     # @jaxel/core — UI-freier, headless-testbarer Modellkern (TypeScript)
      src/
        model/
          node.ts             # DocNode {id, kind, name, attributes[], value, children[], byteRange?}
          document.ts         # JaxelDocument: hält Baum, Revision, format-Meta (xml|json, encoding, indent)
        format/
          xml-import.ts       # XML-Ereignisse (aus Rust) → DocNode-Baum
          xml-export.ts       # DocNode → XML, minimal-invasiv (nur geänderte Knoten reserialisieren)
          json-import.ts      # JSON → DocNode (Objekt/Array/Primitive-Regeln)
          json-export.ts      # DocNode → JSON
          path.ts             # Pfadberechnung: indiziert (a.b[0].c) UND statisch (a.b.c)
        commands/
          command.ts          # Command-Interface {do, undo, label}
          command-bus.ts      # execute/undo/redo, Revision-Bump, Composite
          rename.ts set-value.ts set-attribute.ts
          insert-node.ts remove-node.ts move-node.ts
        search/
          search.ts           # Such-/Ersetz-Logik über den Baum (Name/Wert/Attribut, regex-optional)
      tests/                  # vitest: roundtrip, json/xml-mapping, commands+undo, search, path
    (rust-Kern lebt in apps/editor/src-tauri, s.u. — kein eigenes npm-Paket)
  apps/
    editor/                   # @jaxel/editor — Vite/React-App + Tauri
      src/
        styles.css            # CSS-Variablen-Theme (dunkel Navy/Teal + hell), aus xdp-designer adaptiert
        i18n/                 # de.json, en.json + winziger t()-Hook (kein schweres Framework)
        state/                # aktive Dokumente, Tabs, Auswahl, Settings (Zustand)
        tabs/                 # Tab-Leiste + Multi-Window-Logik
        tree/                 # virtualisierte Baumansicht (Kernkomponente)
        panels/               # rechte Bearbeiten-Panels (Name/Wert/Attribute)
        table/                # untere Kindknoten-Tabellenansicht
        search/               # Such-/Ersetzen-Leiste
        settings/             # Einstellungsdialog
        hotkeys/              # F2, Doppelklick, Ctrl+Z/Y, Ctrl+F, Pfad-Kopieren
      src-tauri/
        Cargo.toml            # quick-xml, encoding_rs, serde, tauri 2 + plugins (dialog, single-instance, fs)
        src/
          lib.rs              # Tauri-Setup, command-Registrierung
          parse.rs            # Streaming-Parse XML/JSON → flache Event-/Index-Struktur an Frontend
          io.rs               # Datei laden (Encoding-Erkennung) / speichern (minimal-invasiv)
          search.rs           # optional: schwere Suche über Rohbytes für Riesen-Dateien
        tauri.conf.json       # Bundle-Targets: appimage, deb, rpm, nsis + portable
        capabilities/
```

### Leitprinzipien (aus xdp-designer übernommen)
1. **Geparster Baum = einzige Wahrheit.** Kein paralleles Datenmodell. React leitet je Render frisch ab (revision-getriggert).
2. **Jede Mutation als Command** über den CommandBus. Ein Nutzer-Schritt = ein Undo-Schritt (Composite).
3. **Logik React-frei & headless testbar** (`*.ts` getrennt von `*.tsx`), Tests mit vitest im `core`-Paket.
4. **Minimal-invasives Speichern:** unveränderte Knoten behalten ihren Original-Bytebereich; nur geänderte werden reserialisiert (`byteRange` am Knoten).
5. **Keine neuen Runtime-Deps ohne guten Grund.** UI-Text zweisprachig (de/en).

### Datenfluss große Dateien
Rust lädt Datei → erkennt Encoding → streamt Parse-Events mit Byte-Offsets → Frontend baut `DocNode`-Baum mit `byteRange`. Baum wird virtualisiert gerendert (nur sichtbare Zeilen im DOM). Beim Speichern schreibt Rust die Datei aus Original-Bytes + reserialisierten Fragmenten der geänderten Knoten zusammen.

### XML↔JSON-Vereinheitlichung (Beispiel)
```
XML  <person id="1"><name>Anna</name></person>
JSON { "person": [ { "id": 1, "name": "Anna" } ] }
beide → Baum:   person
                  @id : 1        (Attribut in XML; in JSON normale Property)
                  name : Anna
```
Pfad-Kopieren liefert für den Knoten `name`: indiziert `person[0].name`, statisch `person.name`.

---

## Roadmap (Arbeitspakete)

**AP0 — Gerüst & Doku.** Monorepo, Workspaces, `core`+`editor`, Tauri-Skeleton, Theme-CSS, i18n-Grundgerüst, `docs/`-Startdateien. → *verify:* `npm run tauri dev` öffnet leeres Fenster auf Linux.

**AP1 — Modellkern (core).** `DocNode`, `JaxelDocument`, CommandBus + Undo/Redo, XML- und JSON-Import/-Export, Pfadberechnung, Suche/Ersetzen. Volle vitest-Abdeckung (Round-Trip, Mapping, Commands, Pfade). → *verify:* `npm test` grün, headless ohne UI.

**AP2 — Baumansicht.** Virtualisierte Baumkomponente, Expand/Collapse, Auswahl, Inline-Anzeige Name/Wert, kompakter Stil wie Screenshot. → *verify:* großes Fixture (100+ MB generiert) flüssig scrollbar.

**AP3 — Editieren.** Doppelklick → Wert editieren, Klick-auf-Name/F2 → umbenennen, Attribut-Panel (hinzufügen/ändern/löschen), Knoten einfügen/löschen/verschieben, alles über Commands + Undo/Redo. → *verify:* Edits sichtbar, Ctrl+Z/Y korrekt, Speichern minimal-invasiv (Diff nur an geänderten Stellen).

**AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht.** Such-Leiste (Name/Wert/Attribut, Treffer-Navigation, Ersetzen/Alle ersetzen), Pfad kopieren (indiziert/statisch), untere Kindknoten-Tabelle. → *verify:* Ersetzen über großes Dokument, Pfade stimmen.

**AP5 — Tabs & Multi-Window & Settings.** Tab-Leiste, mehrere Dokumente, Einstellung „Tabs vs. eigene Fenster", Grundeinstellungen (Theme, Einrückung, Sprache, Multi-Window-Modus, zuletzt geöffnet). → *verify:* mehrere Dateien parallel, Fenster-Modus umschaltbar.

**AP6 — Packaging Linux.** Tauri-Bundle: AppImage + .deb + .rpm. → *verify:* AppImage startet auf sauberem Linux.

**AP7 — Packaging Windows.** portable .exe + .msi/NSIS (Cross/CI). → *verify:* Installer + Portable starten auf Windows.

**AP8 (optional/später).** macOS-Bundle, Namespace-Verwaltungs-Dialog, Maskottchen/Icon-Politur.

### Delegationsstrategie (kleinere Agenten, wie vom User gewünscht)
- Klar abgegrenzte, testgetriebene Pakete an Subagenten geben: z.B. AP1-Unterteile („XML-Import + vitest", „JSON-Mapping + vitest", „CommandBus + Undo-Tests") laufen unabhängig mit hartem Erfolgskriterium (`npm test` grün).
- Ich (Hauptkontext) behalte Architektur, Integration, Review, Doku und das Theme/UX-Zusammenspiel.
- Nach jedem AP: `graphify`/`understand`-Skill laufen lassen, damit Stellen wiederauffindbar bleiben (User-Wunsch), sowie `docs/status.md` + `docs/entscheidungen.md` fortschreiben.

## Selbst-Dokumentation (Pflicht laut Auftrag)
`docs/architektur.md` (Landkarte), `docs/entscheidungen.md` (Entscheidungslog, beginnt mit obiger Tabelle), `docs/status.md` (Ist-Stand je AP), `docs/benutzerhandbuch.md` (wächst mit Features). Jede nennenswerte Entscheidung/Abweichung wird dort festgehalten.

## Verifikation (End-to-End)
- **Kern:** `npm test` (vitest) im `core`-Paket — Round-Trip-, Mapping-, Command/Undo-, Pfad-, Such-Tests grün.
- **Typen/Build:** `tsc --noEmit` in `core` und `editor`, `vite build` in `editor` erfolgreich.
- **App real:** `npm run tauri dev` — Datei öffnen (XML + JSON), editieren, Undo/Redo, suchen/ersetzen, Pfad kopieren, Tab öffnen, Fenster-Modus umschalten, speichern und Diff prüfen (nur geänderte Stellen).
- **Große Datei:** generiertes 100–300-MB-Fixture öffnen, scrollen, editieren, speichern — flüssig und korrekt.
- **Packaging:** AppImage auf Linux startet; später .msi/portable .exe auf Windows.

## Erste konkrete Schritte nach Freigabe
1. AP0-Gerüst anlegen (Workspaces, `core`, `editor`, Tauri-Skeleton, Theme, i18n, `docs/`).
2. `npm install` + `npm run tauri dev` → leeres Fenster verifizieren.
3. AP1 starten (Modellkern testgetrieben), erste abgegrenzte Teilaufgaben an Subagenten delegieren.
