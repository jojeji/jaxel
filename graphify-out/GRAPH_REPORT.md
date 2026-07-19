# Graph Report - .  (2026-07-19)

## Corpus Check
- 13 files · ~73,542 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 675 nodes · 1158 edges · 57 communities (36 shown, 21 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.82)
- Token cost: 0 input · 139,129 output

## Community Hubs (Navigation)
- Fokus-Breadcrumb & Byte-Range-Tracking
- Attribute-Panel
- Editor-Runtime-Dependencies
- Changelog & Architektur-Invarianten
- AP-Roadmap (AP0-AP5)
- App-Shell & Fehlerbehandlung
- Core-Modellkern & CommandBus
- Editor-TS-Config
- Rust-Backend & Logging-Bruecke
- App-Testsuite (Base64/Drag&Drop)
- Logo-Konzept Markup-Klammern & Local-Prefs
- Suchen/Ersetzen-Panel
- Linux-Paketierung (Bundle/Dateizuordnung)
- i18n-Layer
- Grundsatzentscheidungen (Kickoff)
- Core-Package-Devdependencies
- Core-TS-Config
- Tauri-Konfiguration
- Rust-Datei-IO (io.rs)
- Benutzerhandbuch-Struktur
- Desktop-Reife (Ist-Stand)
- Root-Package-Skripte
- AP9-Feature-Entscheidungen
- Tauri-Capabilities/Permissions
- XML-Export/Serialisierung
- Base64-Decode-Feature
- Kontextmenue
- Logo-Entwuerfe Uebersicht
- Logo-Entwurf A (Knotenbaum)
- Logo-Entwurf C (Monogramm) & AP8
- IconButton-Komponente
- Easy XML Editor Referenz (Tabellenansicht)
- Easy XML Editor Referenz (Namespaces)
- HTML/Main-Einstiegspunkt
- Easy XML Editor Referenz (Kontextmenue)
- App-Icon Platzhalter
- App-Icon 256px
- App-Icon 128px
- App-Icon 32px
- App-Icon 64px
- App-Icon 512px
- Windows-Icon 107px
- Windows-Icon 142px
- Windows-Icon 150px
- Windows-Icon 284px
- Windows-Icon 30px
- Windows-Icon 310px
- Windows-Icon 44px
- Windows-Icon 71px
- Windows-Icon 89px
- Windows-StoreLogo
- Rust-Result-Typ
- Rust-String-Typ

## God Nodes (most connected - your core abstractions)
1. `DocNode` - 31 edges
2. `Entscheidungslog — Jaxel` - 29 edges
3. `useI18n()` - 23 edges
4. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 18 edges
5. `Ist-Stand — Jaxel` - 18 edges
6. `AP9 — Fokus-Ansicht, Unterbaum-Suche, Neues Dokument, externe Änderungen, DnD-Transparenz, Über-Dialog` - 18 edges
7. `captureByteRanges()` - 16 edges
8. `Command` - 16 edges
9. `createNode()` - 16 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `resolveNodeBySegments (progressiv kürzere Präfixe als Fallback)` --shares_data_with--> `getPathSegments()`  [INFERRED]
  docs/status.md → packages/core/src/format/path.ts
- `Große Dateien: Streaming-Parse + Byte-Offset-Index, virtualisierte Baumansicht` --shares_data_with--> `buildByteOffsetTable()`  [INFERRED]
  docs/entscheidungen.md → packages/core/src/format/xml-import.ts
- `AP2 — Baumansicht + Datei öffnen` --references--> `buildByteOffsetTable()`  [EXTRACTED]
  docs/status.md → packages/core/src/format/xml-import.ts
- `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen` --semantically_similar_to--> `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Grilling 2026-07-18: AP9-Feature-Bündel (Fokus, Unterbaum-Suche, Neues Dokument, Reload, DnD)** — docs_entscheidungen_fokus_ansicht, docs_entscheidungen_suche_unterbaum, docs_entscheidungen_neues_dokument, docs_entscheidungen_externe_aenderungen_reload, docs_entscheidungen_dnd_transparenz, docs_status_ap9_fokus_unterbaum_neues_dokument_reload_dnd_ueber [EXTRACTED 1.00]
- **Base64-Decode-Feature: Grilling-Entscheidungen, Umsetzung und Benutzerdoku** — docs_entscheidungen_base64_erkennung, docs_entscheidungen_base64_sichtbarkeit, docs_entscheidungen_base64_anzeige, docs_entscheidungen_base64_readonly, docs_status_ap13_base64_decode_ansicht, docs_benutzerhandbuch_base64_inhalte_anzeigen [EXTRACTED 0.95]
- **AP15: Absturz-/Fehler-Logging Grundsatzentscheidungen und Umsetzung** — docs_entscheidungen_absturz_logging_datenschutz, docs_entscheidungen_absturz_logging_breadcrumbs, docs_entscheidungen_absturz_logging_bruecke, docs_entscheidungen_absturz_logging_core_frei, docs_status_ap15_absturz_fehler_logging [EXTRACTED 1.00]
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (57 total, 21 thin omitted)

### Community 0 - "Fokus-Breadcrumb & Byte-Range-Tracking"
Cohesion: 0.09
Nodes (38): FocusBreadcrumbProps, captureByteRanges(), clearByteRanges(), restoreByteRanges(), CommandBus, Command, createCompositeCommand(), createInsertNodeCommand() (+30 more)

### Community 1 - "Attribute-Panel"
Cohesion: 0.06
Nodes (33): useI18n(), AttributesPanel(), AttributesPanelProps, TreeRow, DropPosition, DropTarget, EditingField, setDragGhost() (+25 more)

### Community 2 - "Editor-Runtime-Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, devDependencies (+39 more)

### Community 3 - "Changelog & Architektur-Invarianten"
Cohesion: 0.06
Nodes (41): Behoben: Absturz beim Wechsel zwischen offenen Dokumenten mit offenem Suchpanel, CHANGELOG.md — Jaxel Änderungsprotokoll, Geändert: Theme grundlegend überarbeitet (hell als neuer Standard, Icon-Toolbar), Unreleased: XML/JSON-Baumeditor, Bearbeiten, Tastaturbedienung, Suchen/Ersetzen, Pfad kopieren, Kontextmenü, Tabs, Startscreen, Logo, Linux-Pakete, apps/editor (Vite/React-UI + Tauri), Invariante: Jede Mutation als Command über den CommandBus, CLAUDE.md — Arbeitsanweisung für KI-Agenten, Gemeinsames DocNode-Modell für XML und JSON (+33 more)

### Community 4 - "AP-Roadmap (AP0-AP5)"
Cohesion: 0.06
Nodes (41): AP0 — Gerüst & Doku, AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows (+33 more)

### Community 5 - "App-Shell & Fehlerbehandlung"
Cohesion: 0.08
Nodes (28): App(), ErrorBoundary, Props, State, installGlobalErrorLogging(), logError(), logInfo(), LogLevel (+20 more)

### Community 6 - "Core-Modellkern & CommandBus"
Cohesion: 0.12
Nodes (27): packages/core bleibt frei von Logging-Code, AP1 — Modellkern (packages/core), coalesceKey (CommandBus-Verschmelzung aufeinanderfolgender Commands), CommandBus (packages/core/src/commands), arrayText(), escapeJsonString(), formatPrimitive(), groupByName() (+19 more)

### Community 7 - "Editor-TS-Config"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 8 - "Rust-Backend & Logging-Bruecke"
Cohesion: 0.23
Nodes (20): AppHandle, FileContent, FileStatResult, log_frontend(), open_decoded_file(), open_log(), PendingOpenPaths, read_text_file() (+12 more)

### Community 9 - "App-Testsuite (Base64/Drag&Drop)"
Cohesion: 0.10
Nodes (12): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openSampleFile(), readText (+4 more)

### Community 10 - "Logo-Konzept Markup-Klammern & Local-Prefs"
Cohesion: 0.12
Nodes (16): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), addRecentFile(), getRecentFiles(), StoredSession, App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, fileName() (+8 more)

### Community 11 - "Suchen/Ersetzen-Panel"
Cohesion: 0.20
Nodes (14): SearchPanel(), SearchPanelProps, CompiledMatcher, compileMatcher(), findAll(), includesAttribute(), includesName(), includesValue() (+6 more)

### Community 12 - "Linux-Paketierung (Bundle/Dateizuordnung)"
Cohesion: 0.11
Nodes (18): bundle, active, fileAssociations, icon, linux, targets, desktopTemplate, deb (+10 more)

### Community 13 - "i18n-Layer"
Cohesion: 0.16
Nodes (14): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale, SettingsDialog(), SettingsDialogProps (+6 more)

### Community 14 - "Grundsatzentscheidungen (Kickoff)"
Cohesion: 0.16
Nodes (17): Entscheidungslog — Jaxel, Arbeitsmodus: autonom bis zum ersten lauffähigen Linux-Editor (AP0–AP5), XML↔JSON-Vereinheitlichung: gemeinsames DocNode-Modell statt Badgerfish, Große Dateien: Streaming-Parse + Byte-Offset-Index, virtualisierte Baumansicht, Bekannte Einschränkung: Ein-Element-Arrays/leere Arrays in JSON-Konvention, Keine XSD/DTD-Schemavalidierung — auch nicht als spätere Ausbaustufe, Kodierung: UTF-8/UTF-16 nativ + Auto-Erkennung ISO-8859-1/Windows-1252 via encoding_rs, Multi-Window: Tabs als Standard, echte OS-Fenster optional (+9 more)

### Community 15 - "Core-Package-Devdependencies"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 16 - "Core-TS-Config"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 17 - "Tauri-Konfiguration"
Cohesion: 0.13
Nodes (14): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+6 more)

### Community 18 - "Rust-Datei-IO (io.rs)"
Cohesion: 0.40
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 19 - "Benutzerhandbuch-Struktur"
Cohesion: 0.19
Nodes (13): apps/editor/src/search/SearchBar.tsx, Benutzerhandbuch — Jaxel, Baumansicht und Navigation, Bearbeiten (Name/Wert/Kind/Duplizieren/Löschen/Copy-Paste/Undo), Einstellungen (Theme, Sprache, externe Änderungen, Fenster-Modus), Pfad kopieren (voll/indiziert/statisch), Suchen, Ersetzen, Filtern, Tastenkürzel-Übersicht (+5 more)

### Community 20 - "Desktop-Reife (Ist-Stand)"
Cohesion: 0.24
Nodes (12): apps/editor/src-tauri/jaxel.desktop, Dateien öffnen und speichern, Schutz vor Datenverlust beim Schließen, Sitzung wiederherstellen (Benutzersicht), Priorisierung Desktop-Reife-Lücken (Ungespeichert-Warnung, Öffnen-mit, Sitzung wiederherstellen), Ist-Stand — Jaxel, AP10 — Ungespeichert-Warnung beim Tab- und Fenster-Schließen, AP11 — 'Öffnen mit' bei laufender App: Weiterleitung an laufende Instanz (+4 more)

### Community 21 - "Root-Package-Skripte"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 22 - "AP9-Feature-Entscheidungen"
Cohesion: 0.22
Nodes (10): Extern geänderte Dateien (Reload-Dialog), Fokus-Ansicht ab einem Knoten (Benutzersicht), Entscheidung: Baum-Drag&Drop-Transparenz via eigenem Drag-Bild, Entscheidung: Erkennung externer Dateiänderungen nur bei Fenster-Fokus, mtime+Größe-Vergleich, Entscheidung: Fokus-Ansicht = live Unterbaum-Ansicht, kein Klon-Dokument, Entscheidung: Neues Dokument anlegen (XML/JSON), Tab 'Unbenannt-N', AP9 — Fokus-Ansicht, Unterbaum-Suche, Neues Dokument, externe Änderungen, DnD-Transparenz, Über-Dialog, DocNode-Modell (packages/core/src/model) (+2 more)

### Community 23 - "Tauri-Capabilities/Permissions"
Cohesion: 0.22
Nodes (8): description, identifier, permissions, $schema, windows, core:default, dialog:default, main

### Community 24 - "XML-Export/Serialisierung"
Cohesion: 0.50
Nodes (7): escapeAttr(), escapeText(), serializeAttributes(), serializeNode(), serializeNodeMinimal(), serializeXml(), serializeXmlMinimal()

### Community 25 - "Base64-Decode-Feature"
Cohesion: 0.29
Nodes (7): Base64-Inhalte anzeigen (Benutzersicht), Base64-Anzeige zweigleisig per Magic-Byte-Erkennung, Base64-Erkennung: Heuristik + Kontextmenü-Fallback, Base64-Decode ist read-only, kein Re-Encode (Scope-Cut), Base64-Sichtbarkeit: klickbares Badge in der Baumzeile, AP13 — Base64-Decode-Ansicht, vscode-tci (PO-Projekt, Base64-CodeLens-Vorbild)

### Community 26 - "Kontextmenue"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 27 - "Logo-Entwuerfe Uebersicht"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 28 - "Logo-Entwurf A (Knotenbaum)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 29 - "Logo-Entwurf C (Monogramm) & AP8"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 31 - "Easy XML Editor Referenz (Tabellenansicht)"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

### Community 32 - "Easy XML Editor Referenz (Namespaces)"
Cohesion: 0.67
Nodes (3): Namespaces: V1 erhält sie nur korrekt, kein Verwaltungsdialog, AP0 — Gerüst & Doku, Easy XML Editor (Referenz-/abgelöstes Tool)

## Knowledge Gaps
- **207 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ist-Stand — Jaxel` connect `Desktop-Reife (Ist-Stand)` to `Easy XML Editor Referenz (Namespaces)`, `App-Shell & Fehlerbehandlung`, `Core-Modellkern & CommandBus`, `Logo-Konzept Markup-Klammern & Local-Prefs`, `Grundsatzentscheidungen (Kickoff)`, `Tauri-Konfiguration`, `Benutzerhandbuch-Struktur`, `AP9-Feature-Entscheidungen`, `Base64-Decode-Feature`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `AP9 — Fokus-Ansicht, Unterbaum-Suche, Neues Dokument, externe Änderungen, DnD-Transparenz, Über-Dialog` connect `AP9-Feature-Entscheidungen` to `Fokus-Breadcrumb & Byte-Range-Tracking`, `Attribute-Panel`, `App-Shell & Fehlerbehandlung`, `Suchen/Ersetzen-Panel`, `Rust-Datei-IO (io.rs)`, `Benutzerhandbuch-Struktur`, `Desktop-Reife (Ist-Stand)`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `Attribute-Panel` to `Logo-Konzept Markup-Klammern & Local-Prefs`, `App-Shell & Fehlerbehandlung`, `Suchen/Ersetzen-Panel`, `i18n-Layer`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _207 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Fokus-Breadcrumb & Byte-Range-Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.09022556390977443 - nodes in this community are weakly interconnected._
- **Should `Attribute-Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.05647058823529412 - nodes in this community are weakly interconnected._
- **Should `Editor-Runtime-Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._