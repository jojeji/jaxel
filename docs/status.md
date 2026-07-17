# Ist-Stand — Jaxel

Wird nach jedem Arbeitspaket (AP) fortgeschrieben: was wurde gebaut, warum, bewusste
Vereinfachungen, offene Punkte. Neueste Einträge oben.

## AP1 — Modellkern (abgeschlossen)

`packages/core` steht vollständig, headless getestet, 52/52 vitest-Tests grün, `tsc --noEmit`
fehlerfrei (in `packages/core` und `apps/editor`).

- **Modell** (`src/model/`): `DocNode` (gemeinsamer Baum für XML+JSON), `JaxelDocument`.
- **CommandBus** (`src/commands/`): Undo/Redo, `createCompositeCommand`, sechs Mutations-Commands
  (rename, set-value, set-attribute, insert/remove/move-node).
- **XML** (`src/format/xml-import.ts`, `xml-export.ts`): selbstgebauter Pull-Parser mit exakten
  Byte-Offsets (UTF-8-korrekt), Entity-Dekodierung, CDATA/Kommentare/PIs werden toleriert aber
  nicht modelliert, Namespace-Präfixe bleiben als Text erhalten. `serializeXmlMinimal` kopiert
  unveränderte Knoten byte-genau aus dem Original, geänderte werden aus dem Modell neu gebaut.
  Bekannte V1-Einschränkung: echter Mischinhalt (Text + Kindelemente gemischt) wird nicht als
  eigener Knotentyp abgebildet (dokumentiert im Code).
- **JSON** (`src/format/json-import.ts`, `json-export.ts`): eigener Parser (kein `JSON.parse` als
  Wahrheit, da das Zahlen-Rohtext und Objekt-Key-Reihenfolge verfälschen könnte). Wurzel-Sonderfälle
  (Einzel-Key, Multi-Key, nackter Array/Primitivwert) sauber gelöst und getestet. **Bekannte
  Einschränkung** (siehe `docs/entscheidungen.md`, Eintrag 2026-07-17): Arrays mit genau einem
  Element sind von einem nackten Einzelwert nicht unterscheidbar; leere Arrays als Property-Wert
  verlieren beim Speichern ihren Schlüssel. Bewusst in Kauf genommen (Konsequenz aus Entscheidung #4).
- **Pfade** (`src/format/path.ts`): `computePaths` liefert indizierten (`a[0].b`) und statischen
  (`a.b`) Pfad; Index nur unter gleichnamigen Geschwistern, keine `[0]` bei eindeutigen Namen.
- **Suche** (`src/search/search.ts`): `findAll`/`replaceAll` über Name/Wert/Attribute, Regex
  optional, case-insensitive per Default.
- **Korrektheitsfix während der Integration**: Die Mutations-Commands haben ursprünglich nur das
  `byteRange` des jeweils geänderten Knotens gelöscht. Da `serializeXmlMinimal` die Rekursion
  abbricht, sobald ein *Vorfahre* noch ein gültiges `byteRange` trägt (Vorfahre = "hier hat sich
  nichts geändert"), hätte das tief verschachtelte Änderungen beim minimal-invasiven Speichern
  still verschluckt. Behoben: alle Commands nehmen jetzt eine `ancestors`-Kette entgegen und
  invalidieren `byteRange` bis zur Wurzel (`src/commands/byte-range.ts`). `search.ts::replaceAll`
  hatte denselben Fehler (Knoten mutiert, `byteRange` nicht gelöscht) — ebenfalls behoben.
- **Arbeitsweise**: XML-Mapping, JSON-Mapping, Pfadberechnung und Suche wurden an vier parallele
  Subagenten delegiert (je eigene Dateien, eigene Tests, harte Erfolgskriterien). Modellkern,
  CommandBus, Mutations-Commands und die Integration/Review (inkl. des obigen Korrektheitsfixes)
  kamen aus dem Hauptkontext.

## AP0 — Gerüst & Doku (abgeschlossen)

- Monorepo mit npm-Workspaces angelegt (`packages/core`, `apps/editor`).
- `docs/architektur.md`, `docs/entscheidungen.md`, dieses Statusdokument, `docs/benutzerhandbuch.md`
  angelegt.
- Referenz-Screenshots vom Easy XML Editor nach `assets/screenshots/` verschoben.
- Git-Repo initialisiert (Branch `main`).
- Tauri-2-App (`apps/editor`) inkl. Rust-Backend (`read_text_file`/`write_text_file` mit
  Encoding-Erkennung über `encoding_rs`, BOM + XML-Deklaration), Theme (Petrol/Navy, an
  profiforms-CI/xdp-designer angelehnt), i18n-Grundgerüst (de/en, Browser-Sprache als Default).
  Platzhalter-Icon generiert (`src-tauri/icons/`, später durch echtes Branding ersetzen).
- **Live verifiziert**: `npm run dev` gebaut und gestartet (lokale Toolchain: Node 18.19.1, rustc
  1.97.0, webkit2gtk-4.1 vorhanden), Fenster geöffnet und per Screenshot bestätigt — dunkles Theme,
  deutsche Spracherkennung, Petrol-Akzent-Button rendern korrekt. Prozess danach sauber beendet.
