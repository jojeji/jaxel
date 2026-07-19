# Graph Report - /home/joey/Arbeit/Projekte/sonstiges/xml-editor  (2026-07-19)

## Corpus Check
- 109 files · ~72,135 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 642 nodes · 1121 edges · 57 communities (35 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.84)
- Token cost: 120,093 input · 0 output

## Community Hubs (Navigation)
- UI-Dialoge & Fokus-Ansicht
- Editor-Paketabhängigkeiten
- Benutzerhandbuch
- Changelog & Arbeitsanweisungen
- Kickoff-Plan (Archiv)
- Suche & JSON-Import
- App-Interaktionstests
- Tauri-Konfiguration
- Dokument-Store (Tabs/Docs)
- Editor-TSConfig
- Rust-Backend (lib.rs)
- App-Shell & lokale Präferenzen
- Core-Paketmanifest
- Core-TSConfig
- apps editor src tree
- apps editor src ui
- apps editor src tauri
- package
- packages core src format
- packages core src format
- apps editor src state
- apps editor src tauri
- packages core src format
- assets logo drafts variante
- docs entscheidungen easy xml
- apps editor src welcome
- apps editor src ui
- assets logo drafts preview
- assets logo drafts variante
- assets logo drafts variante
- apps editor src ui
- assets screenshots 2026 07
- apps editor index html
- assets screenshots 2026 07
- docs entscheidungen multi window
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- apps editor src tauri
- docs entscheidungen keine xsd
- docs status ap3

## God Nodes (most connected - your core abstractions)
1. `DocNode` - 33 edges
2. `useI18n()` - 25 edges
3. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 18 edges
4. `Command` - 17 edges
5. `createNode()` - 17 edges
6. `captureByteRanges()` - 16 edges
7. `CommandBus` - 16 edges
8. `compilerOptions` - 15 edges
9. `CLAUDE.md — Arbeitsanweisung für KI-Agenten` - 14 edges
10. `App()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen` --semantically_similar_to--> `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts
- `App()` --calls--> `findAncestorChain()`  [EXTRACTED]
  apps/editor/src/App.tsx → packages/core/src/format/path.ts
- `App()` --calls--> `findNodeById()`  [EXTRACTED]
  apps/editor/src/App.tsx → packages/core/src/format/path.ts
- `useJaxelDocuments()` --calls--> `serializeJson()`  [EXTRACTED]
  apps/editor/src/state/document-store.ts → packages/core/src/format/json-export.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **AP9-Feature-Set aus dem Grilling 2026-07-18** — docs_status_ap9, docs_entscheidungen_fokus_ansicht, docs_entscheidungen_unterbaum_suche, docs_entscheidungen_neues_dokument, docs_entscheidungen_externe_anderungserkennung, docs_entscheidungen_dnd_transparenz [EXTRACTED 1.00]
- **Desktop-Reife-Rollout in PO-Priorität (AP10-AP14)** — docs_entscheidungen_desktop_reife, docs_status_ap10, docs_status_ap11, docs_status_ap12, docs_status_ap13, docs_status_ap14 [EXTRACTED 1.00]
- **Öffnen-mit-Pipeline (CLI-Args, Dateizuordnung, zweite Instanz)** — docs_status_pendingopenpaths, docs_status_ap2, docs_status_ap11, docs_status_linux_dateizuordnung [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (57 total, 22 thin omitted)

### Community 0 - "UI-Dialoge & Fokus-Ansicht"
Cohesion: 0.10
Nodes (31): OpenDocumentState, FocusBreadcrumb(), FocusBreadcrumbProps, NewDocumentDialog(), NewDocumentDialogProps, captureByteRanges(), clearByteRanges(), restoreByteRanges() (+23 more)

### Community 1 - "Editor-Paketabhängigkeiten"
Cohesion: 0.04
Nodes (47): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, devDependencies (+39 more)

### Community 2 - "Benutzerhandbuch"
Cohesion: 0.06
Nodes (46): Base64-Inhalte anzeigen (Badge + Decode), Knoten verschieben per Drag&Drop, Extern geänderte Dateien erkennen und neu laden, Fokus-Ansicht ab einem Knoten, Jaxel (XML/JSON-Desktop-Editor), Minimal-invasives Speichern (unveränderte Bereiche byte-genau), Neues Dokument anlegen (XML/JSON, Unbenannt-N), Pfad kopieren (vollständig/indiziert/statisch) (+38 more)

### Community 3 - "Changelog & Arbeitsanweisungen"
Cohesion: 0.06
Nodes (41): Behoben: Absturz beim Wechsel zwischen offenen Dokumenten mit offenem Suchpanel, CHANGELOG.md — Jaxel Änderungsprotokoll, Geändert: Theme grundlegend überarbeitet (hell als neuer Standard, Icon-Toolbar), Unreleased: XML/JSON-Baumeditor, Bearbeiten, Tastaturbedienung, Suchen/Ersetzen, Pfad kopieren, Kontextmenü, Tabs, Startscreen, Logo, Linux-Pakete, apps/editor (Vite/React-UI + Tauri), Invariante: Jede Mutation als Command über den CommandBus, CLAUDE.md — Arbeitsanweisung für KI-Agenten, Gemeinsames DocNode-Modell für XML und JSON (+33 more)

### Community 4 - "Kickoff-Plan (Archiv)"
Cohesion: 0.06
Nodes (41): AP0 — Gerüst & Doku, AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows (+33 more)

### Community 5 - "Suche & JSON-Import"
Cohesion: 0.10
Nodes (32): SearchPanel(), SearchPanelProps, arrayElementToNode(), JArray, JBoolean, JNull, JNumber, JObject (+24 more)

### Community 6 - "App-Interaktionstests"
Cohesion: 0.06
Nodes (22): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openSampleFile(), readText (+14 more)

### Community 7 - "Tauri-Konfiguration"
Cohesion: 0.06
Nodes (32): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+24 more)

### Community 8 - "Dokument-Store (Tabs/Docs)"
Cohesion: 0.15
Nodes (21): detectFormat(), DocsState, NEW_DOCUMENT_SKELETON, nextUntitledPath(), tabKey(), TabState, useJaxelDocuments(), fileName() (+13 more)

### Community 9 - "Editor-TSConfig"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 10 - "Rust-Backend (lib.rs)"
Cohesion: 0.25
Nodes (18): AppHandle, FileContent, FileStatResult, open_decoded_file(), open_log(), PendingOpenPaths, read_text_file(), Result (+10 more)

### Community 11 - "App-Shell & lokale Präferenzen"
Cohesion: 0.24
Nodes (12): App(), addRecentFile(), getLastDir(), getStoredSession(), rememberLastDir(), StoredSession, storeSession(), buildFilterKeepSet() (+4 more)

### Community 12 - "Core-Paketmanifest"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 13 - "Core-TSConfig"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 14 - "apps editor src tree"
Cohesion: 0.16
Nodes (10): AttributesPanel(), AttributesPanelProps, DropPosition, DropTarget, EditingField, setDragGhost(), TreeRowView(), TreeRowViewProps (+2 more)

### Community 15 - "apps editor src ui"
Cohesion: 0.19
Nodes (10): useI18n(), SettingsDialog(), AboutDialog(), AboutDialogProps, Base64PreviewDialog(), Base64PreviewDialogProps, CloseConfirmDialog(), CloseConfirmDialogProps (+2 more)

### Community 16 - "apps editor src tauri"
Cohesion: 0.40
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 17 - "package"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 18 - "packages core src format"
Cohesion: 0.26
Nodes (9): B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedBase64, DecodedContentKind, detectTextFormat(), EXTENSIONS, sniffKind() (+1 more)

### Community 19 - "packages core src format"
Cohesion: 0.40
Nodes (7): escapeAttr(), escapeText(), serializeAttributes(), serializeNode(), serializeNodeMinimal(), serializeXml(), serializeXmlMinimal()

### Community 20 - "apps editor src state"
Cohesion: 0.36
Nodes (7): SettingsDialogProps, DEFAULTS, load(), Settings, Theme, useSettings(), WindowMode

### Community 21 - "apps editor src tauri"
Cohesion: 0.22
Nodes (8): description, identifier, permissions, $schema, windows, core:default, dialog:default, main

### Community 22 - "packages core src format"
Cohesion: 0.47
Nodes (7): arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), nodeToJsonText(), objectText(), serializeJson()

### Community 23 - "assets logo drafts variante"
Cohesion: 0.32
Nodes (8): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58), Variante B: Markup-Klammern Logo (winning draft)

### Community 24 - "docs entscheidungen easy xml"
Cohesion: 0.33
Nodes (6): Easy XML Editor (Vorbild-/Ersatzprodukt), Kodierung: UTF-8/UTF-16 + Alt-Encoding-Erkennung via encoding_rs, Plattform-Reihenfolge: Linux zuerst, dann Windows, macOS zuletzt, Namespaces: V1 nur korrekt erhalten, kein Verwaltungsdialog, AP0 — Gerüst & Doku, AP6 — Linux-Packaging (AppImage/deb/rpm)

### Community 25 - "apps editor src welcome"
Cohesion: 0.60
Nodes (4): getRecentFiles(), fileName(), WelcomeScreen(), WelcomeScreenProps

### Community 26 - "apps editor src ui"
Cohesion: 0.40
Nodes (4): ContextMenu(), ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 27 - "assets logo drafts preview"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 28 - "assets logo drafts variante"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 29 - "assets logo drafts variante"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 31 - "assets screenshots 2026 07"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

## Knowledge Gaps
- **208 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App-Shell & lokale Präferenzen` to `Dokument-Store (Tabs/Docs)`, `apps editor src state`, `App-Interaktionstests`, `apps editor src ui`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `apps editor src ui` to `UI-Dialoge & Fokus-Ansicht`, `Suche & JSON-Import`, `App-Interaktionstests`, `Dokument-Store (Tabs/Docs)`, `App-Shell & lokale Präferenzen`, `apps editor src tree`, `apps editor src state`, `apps editor src welcome`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `DocNode` connect `UI-Dialoge & Fokus-Ansicht` to `Suche & JSON-Import`, `Dokument-Store (Tabs/Docs)`, `App-Shell & lokale Präferenzen`, `apps editor src tree`, `packages core src format`, `packages core src format`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI-Dialoge & Fokus-Ansicht` be split into smaller, more focused modules?**
  _Cohesion score 0.10480769230769231 - nodes in this community are weakly interconnected._
- **Should `Editor-Paketabhängigkeiten` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Benutzerhandbuch` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._