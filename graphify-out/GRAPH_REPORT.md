# Graph Report - .  (2026-07-24)

## Corpus Check
- 24 files · ~97,141 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 773 nodes · 1140 edges · 75 communities (41 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.75)
- Token cost: 164,805 input · 0 output

## Community Hubs (Navigation)
- Release-Historie (CHANGELOG)
- npm-Dependencies (editor)
- Fokus-Ansicht & Byte-Range-Commands
- Kickoff-Plan (AP0-AP15)
- Dialoge & i18n-Layer
- Tauri-Konfiguration
- JSON-Import/Export
- App.test.tsx Test-Fixtures
- Baum-Filter & Änderungsmarker-Flatten
- tsconfig (editor)
- Rust-Backend lib.rs
- Architektur-Leitprinzipien
- App.tsx Hauptkomponente
- document-store.ts Dokumentverwaltung
- Fehlerbehandlung & Logging
- AP16 Domain-Glossar (Dirty/Tombstone)
- Grundsatzentscheidungen XML/JSON-Mapping
- npm devDependencies
- Pfadberechnung (path.ts)
- Suche (search.ts)
- tsconfig (core)
- CommandBus Undo/Redo/Baseline
- Projektrichtlinien (AGENTS.md/CLAUDE.md)
- Rust Datei-I/O (io.rs)
- package.json Scripts
- Settings-Dialog & Settings-Store
- Tauri Capabilities/Permissions
- Status-Log AP0-AP7
- XML-Serialisierung (xml-export.ts)
- Sidebar & Resize-Handle
- SearchPanel-Komponente
- Logo-Konzept Variante B (final)
- TabBar & Tab-Dirty-Anzeige
- ReloadDialog (externe Änderungen)
- Kontextmenü-Komponente
- Toast-Benachrichtigungen
- Tauri Close-Capabilities-Test
- Logo-Entwürfe Vorschau (A/B/C)
- Logo-Entwurf Variante A (verworfen)
- Logo-Entwurf Variante C (verworfen)
- Test-Setup Polyfills
- IconButton-Komponente
- Easy-XML-Editor-Referenz-Screenshot 1
- HTML-Einstiegspunkt
- Easy-XML-Editor-Referenz-Screenshot 2
- App-Icon Platzhalter
- App-Icon 256px
- App-Icon 128px
- App-Icon 32px
- App-Icon 64px
- App-Icon 512px (Haupt-Icon)
- Windows-Icon 107px
- Windows-Icon 142px
- Windows-Icon 150px
- Windows-Icon 284px
- Windows-Icon 30px
- Windows-Icon 310px
- Windows-Icon 44px
- Windows-Icon 71px
- Windows-Icon 89px
- Windows StoreLogo
- Rust Result-Typ
- Rust String-Typ
- Vite-Konfiguration
- Pfad-kopieren-Doku
- String (JSON-Wertetyp)
- Vite-Konfiguration
- About-Dialog
- Toast-Benachrichtigungen
- Kickoff: Autonomer Start bis lauffähiger Linux-Editor
- Encoding-Erkennung (UTF-8/UTF-16/ISO-8859-1/Windows-1252)
- i18n: Deutsch + Englisch

## God Nodes (most connected - your core abstractions)
1. `Ist-Stand — Jaxel (status.md)` - 31 edges
2. `Entscheidungslog — Jaxel` - 29 edges
3. `CommandBus` - 23 edges
4. `Command` - 18 edges
5. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 17 edges
6. `compilerOptions` - 15 edges
7. `DocNode` - 13 edges
8. `Geplante Monorepo-Struktur (npm-Workspaces, gespiegelt an xdp-designer)` - 13 edges
9. `useI18n()` - 11 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Base64-Decode-Ansicht: Heuristik + Kontextmenü-Fallback, read-only` --rationale_for--> `looksLikeBase64()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/format/base64.ts
- `Base64-Decode-Ansicht: Heuristik + Kontextmenü-Fallback, read-only` --rationale_for--> `decodeBase64()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/format/base64.ts
- `Nachtrag 2026-07-21 — Trefferliste als Tabelle: Namespace-Kürzung, Pfad-Kürzung, Kontextmenü` --rationale_for--> `truncatePathLabels()`  [EXTRACTED]
  docs/status.md → packages/core/src/format/path.ts
- `Kritischer Fix 2026-07-22 — Minimal-invasives Speichern verlor die XML-Deklaration` --rationale_for--> `serializeXmlMinimal()`  [EXTRACTED]
  docs/status.md → packages/core/src/format/xml-export.ts
- `saveFile/saveFileAs (apps/editor/src/state/document-store.ts)` --calls--> `syncByteRangesAfterSave()`  [EXTRACTED]
  docs/status.md → packages/core/src/commands/byte-range.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **byteRange lifecycle: minimal-invasive save, refresh-after-save, save-epoch invalidation** — docs_entscheidungen_byte_offset_refresh, docs_entscheidungen_save_epoche, packages_core_src_commands_command_bus_commandbus, packages_core_src_commands_byte_range_syncbyterangesaftersave, packages_core_src_format_xml_export_serializexmlminimal [EXTRACTED 1.00]
- **External file change detection and safe reload decision flow** — docs_entscheidungen_externe_aenderungen_reload, docs_entscheidungen_reload_sichere_entscheidung, apps_editor_src_ui_reloaddialog, docs_status_ap9 [EXTRACTED 1.00]
- **Base64 decode-view feature (heuristic, decoder, AP13 implementation)** — docs_entscheidungen_base64_decode_ansicht, packages_core_src_format_base64_decodebase64, packages_core_src_format_base64_lookslikebase64, docs_status_ap13 [EXTRACTED 1.00]
- **Reload Dialog Feature: Decision → Plan → Implementation** — docs_superpowers_plans_2026_07_21_reload_dialog_focus_plan, docs_entscheidungen_reload_dialog_explicit_choice, docs_entscheidungen_reload_dialog_focus_follows_dirty, docs_entscheidungen_reload_dialog_async_safety, docs_entscheidungen_reload_dialog_no_dialog_stacking, docs_status_nachtrag_reload_dialog_external_changes [EXTRACTED 1.00]
- **Search Focus & Toast Feature: Spec → Plan → Decision → Implementation → Release** — docs_superpowers_specs_2026_07_21_search_focus_toast_design_spec, docs_superpowers_plans_2026_07_21_search_focus_toast_plan, docs_entscheidungen_search_focus_shortcut, docs_entscheidungen_toast_notifications, docs_entscheidungen_toast_timing, docs_status_nachtrag_ctrlf_and_toasts, changelog_v0_3_0 [EXTRACTED 1.00]
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (75 total, 34 thin omitted)

### Community 0 - "Release-Historie (CHANGELOG)"
Cohesion: 0.08
Nodes (30): ToastEntry, captureByteRanges(), clearByteRanges(), restoreByteRanges(), ByteRangeSnapshot, CommandBus, Command, createCompositeCommand() (+22 more)

### Community 1 - "npm-Dependencies (editor)"
Cohesion: 0.04
Nodes (47): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, devDependencies (+39 more)

### Community 2 - "Fokus-Ansicht & Byte-Range-Commands"
Cohesion: 0.07
Nodes (33): RightSidebar(), RightSidebarProps, SidebarTab, CopyPathKind, SearchPanel(), SearchPanelProps, segmentLabel(), stripNamespace() (+25 more)

### Community 3 - "Kickoff-Plan (AP0-AP15)"
Cohesion: 0.09
Nodes (36): FocusBreadcrumbProps, arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), JsonExportDoc, nodeToJsonText(), objectText() (+28 more)

### Community 4 - "Dialoge & i18n-Layer"
Cohesion: 0.06
Nodes (41): AP0 — Gerüst & Doku, AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows (+33 more)

### Community 5 - "Tauri-Konfiguration"
Cohesion: 0.08
Nodes (22): DisplayRow, flattenTree(), TreeRow, withTombstones(), ChangeMarker, DropPosition, DropTarget, EditingField (+14 more)

### Community 6 - "JSON-Import/Export"
Cohesion: 0.06
Nodes (31): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+23 more)

### Community 7 - "App.test.tsx Test-Fixtures"
Cohesion: 0.10
Nodes (19): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale, useI18n(), AttributesPanel() (+11 more)

### Community 8 - "Baum-Filter & Änderungsmarker-Flatten"
Cohesion: 0.13
Nodes (21): detectFormat(), DocsState, NEW_DOCUMENT_SKELETON, nextUntitledPath(), OpenDocumentState, saveFile/saveFileAs (apps/editor/src/state/document-store.ts), tabKey(), TabState (+13 more)

### Community 9 - "tsconfig (editor)"
Cohesion: 0.09
Nodes (12): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openSampleFile(), readText (+4 more)

### Community 10 - "Rust-Backend lib.rs"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 11 - "Architektur-Leitprinzipien"
Cohesion: 0.23
Nodes (20): AppHandle, FileContent, FileStatResult, log_frontend(), open_decoded_file(), open_log(), PendingOpenPaths, read_text_file() (+12 more)

### Community 12 - "App.tsx Hauptkomponente"
Cohesion: 0.11
Nodes (22): Abweichung vom Ursprungsplan: XML/JSON-Parsing in TypeScript statt Rust/quick-xml, Leitprinzip: Jede Mutation läuft als Command über den CommandBus, packages/core/src (TS): DocNode-Modell, CommandBus/Undo, Parser+Serializer, Pfade, Suche, docs/architektur.md — Architektur-Kurzübersicht, Ein gemeinsames Baummodell (DocNode) für XML und JSON, Leitprinzip: Geparster Baum ist die einzige Wahrheit, Große Dateien: Streaming-Parse + Byte-Offset-Index + virtualisierte Baumansicht, Leitprinzip: Logik React-frei und headless testbar (+14 more)

### Community 13 - "document-store.ts Dokumentverwaltung"
Cohesion: 0.13
Nodes (10): App(), ErrorBoundary, Props, State, logError(), logInfo(), LogLevel, logToBackend() (+2 more)

### Community 14 - "Fehlerbehandlung & Logging"
Cohesion: 0.15
Nodes (19): Entscheidungslog — Jaxel, Arbeitsmodus: autonom bis zum ersten lauffähigen Linux-Editor (AP0-AP5), Baum-Drag&Drop-Transparenz via eigenes halbtransparentes Drag-Bild, Kodierung: UTF-8/UTF-16 + Auto-Erkennung Alt-Encodings via encoding_rs, Erkennung externer Dateiänderungen + Reload nur bei Fenster-Fokus, Fokus-Ansicht: virtuelles Dokument ab Knoten X auf demselben lebenden Baum, Keine XSD/DTD-Schemavalidierung — auch nicht als spätere Ausbaustufe, Namespaces: V1 erhält sie nur korrekt, kein Verwaltungsdialog (+11 more)

### Community 15 - "AP16 Domain-Glossar (Dirty/Tombstone)"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 16 - "Grundsatzentscheidungen XML/JSON-Mapping"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 17 - "npm devDependencies"
Cohesion: 0.18
Nodes (15): Jaxel 0.2.0 — Fünf Themes, portabler Windows-Build, Base64-Decode-Ansicht: Heuristik + Kontextmenü-Fallback, read-only, Priorisierung der Desktop-Reife-Lücken (Ungespeichert-Warnung, Öffnen-mit, Sitzung wiederherstellen), Strg+F als Fokus-Shortcut (kein Toggle) + layoutstabile Toast-Meldungen, Ist-Stand — Jaxel (status.md), AP10 — Ungespeichert-Warnung beim Tab- und Fenster-Schließen, AP11 — 'Öffnen mit' bei laufender App: Weiterleitung an laufende Instanz, AP12 — Sitzung wiederherstellen (+7 more)

### Community 18 - "Pfadberechnung (path.ts)"
Cohesion: 0.19
Nodes (14): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Definition of Done Workflow (+6 more)

### Community 19 - "Suche (search.ts)"
Cohesion: 0.40
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 20 - "tsconfig (core)"
Cohesion: 0.15
Nodes (13): Jaxel 0.1.0 — Erste Veröffentlichung, XML↔JSON-Vereinheitlichung: eigenes DocNode-Modell statt Badgerfish, Bekannte Einschränkung: Ein-Element-Arrays nicht von Einzelwert unterscheidbar, Große Dateien: Streaming-Parse + Byte-Offset-Index, virtualisierte Baumansicht, Multi-Window: Tabs als Standard, echte OS-Fenster optional, AP1 — Modellkern (DocNode, CommandBus, XML/JSON-Parser), AP2 — Baumansicht + Datei öffnen, AP3 — Editieren (Wert/Name/Attribute, Undo/Redo, Einfügen/Löschen) (+5 more)

### Community 21 - "CommandBus Undo/Redo/Baseline"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 22 - "Projektrichtlinien (AGENTS.md/CLAUDE.md)"
Cohesion: 0.24
Nodes (9): B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedBase64, DecodedContentKind, detectTextFormat(), EXTENSIONS, sniffKind() (+1 more)

### Community 23 - "Rust Datei-I/O (io.rs)"
Cohesion: 0.27
Nodes (8): SettingsDialogProps, THEMES, DEFAULTS, load(), Settings, Theme, useSettings(), WindowMode

### Community 24 - "package.json Scripts"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 25 - "Settings-Dialog & Settings-Store"
Cohesion: 0.22
Nodes (8): Jaxel 0.3.1 — Suchtreffer-Wert-Spalte-Fix, Jaxel 0.3.2 — XML-Deklaration ging verloren, Jaxel 0.4.0 — Ungespeicherte Änderungen sichtbar, Jaxel 0.4.1 — Baum kollabierte beim Tab-Wechsel, AP16 — Ungespeicherte Änderungen sichtbar machen, Nachtrag 2026-07-22 — Suchtreffer-Tabelle: Wert-Spalte zeigt Elementinhalt statt Namen, Nachtrag 2026-07-22 — Baum kollabierte beim Tab-Wechsel, Kritischer Fix 2026-07-22 — Minimal-invasives Speichern verlor die XML-Deklaration

### Community 26 - "Tauri Capabilities/Permissions"
Cohesion: 0.32
Nodes (8): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58), Variante B: Markup-Klammern Logo (winning draft)

### Community 27 - "Status-Log AP0-AP7"
Cohesion: 0.38
Nodes (7): Anker-Geschwister (Anchor Sibling), Änderungsmarker (Change Marker), Tombstone (Domain Term), Änderungen im Baum markieren, Bearbeiten (Name/Wert/Attribute/Undo), Extern geänderte Dateien / Reload, Einstellungen

### Community 29 - "Sidebar & Resize-Handle"
Cohesion: 0.40
Nodes (6): Unreleased (2 kritische XML-Speicher-Bugs), Byte-Offsets nach dem Speichern auffrischen (syncByteRangesAfterSave), Round-Trip: format-erhaltend, best effort, Save-Epoche: byteRange-Invalidierung im CommandBus zentralisiert, Nachtrag 2026-07-24 — byteRange-Invalidierung zentralisiert (Save-Epoche), Nachtrag 2026-07-24 — Zweites Speichern konnte die XML zerstören (kritischer Fix)

### Community 30 - "SearchPanel-Komponente"
Cohesion: 0.33
Nodes (6): Jaxel 0.3.0 — Trefferliste als Tabelle, Sichere Entscheidung bei externen Dateiänderungen: explizite Reload-Wahl, Nachtrag 2026-07-21 — Reload-Dialog bei externen Änderungen, Nachtrag 2026-07-21 — Baum: Scroll-Position bleibt beim Auf-/Zuklappen erhalten, Nachtrag 2026-07-21 — Tastaturnavigation Trefferliste, ziehbares/andockbares Suchpanel, Nachtrag 2026-07-21 — Trefferliste als Tabelle: Namespace-Kürzung, Pfad-Kürzung, Kontextmenü

### Community 31 - "Logo-Konzept Variante B (final)"
Cohesion: 0.40
Nodes (6): Build Job: Linux/Windows Matrix, Check Job: Tests & Versionscheck, Portable Windows ZIP Packaging Step, tauri-apps/tauri-action Usage, Tag-Version Consistency Gate, Release Workflow (GitHub Actions)

### Community 32 - "TabBar & Tab-Dirty-Anzeige"
Cohesion: 0.33
Nodes (3): branch, existingTags, rl

### Community 33 - "ReloadDialog (externe Änderungen)"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 36 - "Tauri Close-Capabilities-Test"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 37 - "Logo-Entwürfe Vorschau (A/B/C)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 38 - "Logo-Entwurf Variante A (verworfen)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 41 - "IconButton-Komponente"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

### Community 42 - "Easy-XML-Editor-Referenz-Screenshot 1"
Cohesion: 1.00
Nodes (3): Absturz- und Fehler-Logging (AP15): Frontend-Logging-Brücke, Rust nur Fehlschläge, Datenschutz-Invariante Logging: nur Pfade, Fehlermeldungen, Metadaten, AP15 — Absturz- und Fehler-Logging

## Knowledge Gaps
- **246 isolated node(s):** `Locale`, `catalogs`, `I18nContextValue`, `I18nContext`, `AboutDialogProps` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Entscheidungslog — Jaxel` connect `Fehlerbehandlung & Logging` to `Tauri-Konfiguration`, `Easy-XML-Editor-Referenz-Screenshot 1`, `npm devDependencies`, `tsconfig (core)`, `Sidebar & Resize-Handle`, `SearchPanel-Komponente`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `DocNode` connect `Kickoff-Plan (AP0-AP15)` to `Tauri-Konfiguration`, `App.test.tsx Test-Fixtures`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Ist-Stand — Jaxel (status.md)` connect `npm devDependencies` to `Easy-XML-Editor-Referenz-Screenshot 1`, `Fehlerbehandlung & Logging`, `tsconfig (core)`, `Settings-Dialog & Settings-Store`, `Sidebar & Resize-Handle`, `SearchPanel-Komponente`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `Locale`, `catalogs`, `I18nContextValue` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Release-Historie (CHANGELOG)` be split into smaller, more focused modules?**
  _Cohesion score 0.08115942028985507 - nodes in this community are weakly interconnected._
- **Should `npm-Dependencies (editor)` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Fokus-Ansicht & Byte-Range-Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.06826241134751773 - nodes in this community are weakly interconnected._