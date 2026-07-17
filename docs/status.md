# Ist-Stand — Jaxel

Wird nach jedem Arbeitspaket (AP) fortgeschrieben: was wurde gebaut, warum, bewusste
Vereinfachungen, offene Punkte. Neueste Einträge oben.

## AP2 — Baumansicht + Datei öffnen (funktional fertig, visuelle Verifikation ausstehend)

- **State** (`apps/editor/src/state/document-store.ts`): `useJaxelDocument()`-Hook. Öffnet eine
  Datei über den Rust-Command `read_text_file`, erkennt XML/JSON per Endung (Fallback: erstes
  Nicht-Whitespace-Zeichen), parst über `@jaxel/core`, hält `CommandBus` + `JaxelDocument`.
  `saveFile()` nutzt `serializeXmlMinimal`/`serializeJson` und schreibt über `write_text_file`.
- **Baum** (`apps/editor/src/tree/`): `flattenTree` (reine Funktion, Tiefensuche über
  eingeklappte/ausgeklappte Knoten) + `TreeView.tsx` (virtualisiert: nur sichtbare Zeilen +
  Overscan werden gerendert, `ResizeObserver` für Viewport-Höhe, keine externe Library).
- **Datei-Öffnen-Workflow**: Tauri-Dialog-Plugin für „Datei öffnen…“; zusätzlich nimmt die
  Rust-Seite jetzt auch Kommandozeilen-Argumente entgegen (`jaxel some.xml`) und die
  Frontend-Seite holt sie beim Start über `take_pending_open_paths` ab (Pull- statt
  Event-Push-Modell, da der Event-Listener beim App-Start noch nicht sicher registriert ist —
  gleiches Muster wie bei xdp-designer). Nützlich sowohl als spätere Dateiverknüpfung als auch
  für Tests.
- **Zwei ernsthafte Bugs bei der Verifikation mit einer 184-MB-Testdatei (1,2 Mio. `<person>`,
  6.000.001 Knoten) gefunden und behoben, BEVOR sie in Produktion aufgefallen wären:**
  1. `buildByteOffsetTable` in `xml-import.ts` nutzte eine normale JS-`Array` (vorab dimensioniert
     auf die Zeichenlänge) — das wirft nachweislich `RangeError: Invalid array length` nach ca.
     11 Mio. sequenziellen Schreibzugriffen auf ein groß deklariertes Array (ein reales,
     reproduzierbares V8/Node-Verhalten, unabhängig vom verfügbaren Heap; nicht dokumentiert,
     empirisch verifiziert). Jede Datei über ca. 11 MB Zeichenlänge hätte den Parser abstürzen
     lassen — ein Totalausfall für genau das Kernfeature "große XML-Dateien", das explizit
     gefordert war. **Fix**: `Uint32Array` statt `Array` (keine Holey/Packed-Transition, zudem
     kompakter).
  2. Dieselbe Funktion baute die Byte-Länge jedes Zeichens per `TextEncoder().encode(...)` PRO
     Zeichen auf — bei ~193 Mio. Zeichen (184 MB Datei) lief das nicht in vertretbarer Zeit durch
     (Abbruch nach >60s ohne Ergebnis). **Fix**: direkte Arithmetik über UTF-16-Codepunkte/
     Surrogatpaare statt Objekterzeugung pro Zeichen. Ergebnis: komplettes `parseXml` auf der
     184-MB-Datei jetzt in ca. 8s (Node/tsx, ohne Bundling-Optimierung), korrekte Knotenzahl.
  Beide Fixes committet, alle 52 Kern-Tests weiterhin grün, `tsc --noEmit` fehlerfrei.
- **Verifikationsstatus**: `cargo check` und `tsc --noEmit` sauber für Rust- und TS-Seite.
  Vom PO live bestätigt: Baumansicht funktioniert.
- **Stolperfalle beim Start (behoben in der Doku, kein Code-Bug)**: `apps/editor/package.json`
  hat ein eigenes `"dev": "vite"`-Skript, das NUR den Vite-Server ohne Tauri-Fenster startet.
  Wird die resultierende URL (`localhost:1420`) dann in einem normalen Browser statt im
  Tauri-Fenster geöffnet, fehlt `window.__TAURI_INTERNALS__` und jeder `invoke()`-Aufruf
  (z.B. beim Klick auf „Datei öffnen") schlägt mit `Cannot read properties of undefined
  (reading 'invoke')` fehl. **Richtig ist `npm run dev` im Projekt-Wurzelverzeichnis** (startet
  Tauri inkl. eingebettetem Vite). In README.md und AGENTS.md als Warnung ergänzt.
- **Noch offen für AP3+**: Editieren ist noch nicht verdrahtet (Baum ist reine Anzeige), Attribute
  werden zwar angezeigt aber nicht editierbar, kein Kontextmenü, keine Pfad-Kopieren-UI.

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
