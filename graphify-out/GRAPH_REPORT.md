# Graph Report - .  (2026-07-22)

## Corpus Check
- 46 files · ~92,860 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 763 nodes · 1188 edges · 67 communities (40 shown, 27 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.74)
- Token cost: 196,547 input · 0 output

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
- Pfad-kopieren-Doku

## God Nodes (most connected - your core abstractions)
1. `DocNode` - 23 edges
2. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 17 edges
3. `CommandBus` - 17 edges
4. `AP16 — Ungespeicherte Änderungen sichtbar machen` - 16 edges
5. `compilerOptions` - 15 edges
6. `captureByteRanges()` - 15 edges
7. `Geplante Monorepo-Struktur (npm-Workspaces, gespiegelt an xdp-designer)` - 13 edges
8. `App()` - 12 edges
9. `useI18n()` - 11 edges
10. `Command` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts
- `FocusBreadcrumbProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/tree/FocusBreadcrumb.tsx → packages/core/src/model/node.ts
- `Jaxel-Logo SVG (Variante B: Markup-Klammern)` --references--> `App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo`  [INFERRED]
  apps/editor/src/assets/jaxel-logo.svg → assets/logo-drafts/variante-b-markup.svg
- `App()` --calls--> `findAncestorChain()`  [EXTRACTED]
  apps/editor/src/App.tsx → packages/core/src/format/path.ts
- `App()` --calls--> `findNodeById()`  [EXTRACTED]
  apps/editor/src/App.tsx → packages/core/src/format/path.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Features Released in Jaxel v0.1.0** — changelog_v0_1_0, docs_status_ap1_core_model, docs_status_ap2_treeview_openfile, docs_status_ap3_editing, docs_status_ap4_search_replace_pathcopy, docs_status_ap5_tabs_settings, docs_status_ap6_linux_packaging, docs_status_ap7_polish_ux_theme, docs_status_ap8_contextmenu_fullpath_attredit_dnd_logo, docs_status_ap15_crash_logging [INFERRED 0.85]
- **Reload Dialog Feature: Decision → Plan → Implementation** — docs_superpowers_plans_2026_07_21_reload_dialog_focus_plan, docs_entscheidungen_reload_dialog_explicit_choice, docs_entscheidungen_reload_dialog_focus_follows_dirty, docs_entscheidungen_reload_dialog_async_safety, docs_entscheidungen_reload_dialog_no_dialog_stacking, docs_status_nachtrag_reload_dialog_external_changes [EXTRACTED 1.00]
- **Search Focus & Toast Feature: Spec → Plan → Decision → Implementation → Release** — docs_superpowers_specs_2026_07_21_search_focus_toast_design_spec, docs_superpowers_plans_2026_07_21_search_focus_toast_plan, docs_entscheidungen_search_focus_shortcut, docs_entscheidungen_toast_notifications, docs_entscheidungen_toast_timing, docs_status_nachtrag_ctrlf_and_toasts, changelog_v0_3_0 [EXTRACTED 1.00]
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (67 total, 27 thin omitted)

### Community 0 - "Release-Historie (CHANGELOG)"
Cohesion: 0.06
Nodes (59): Keep a Changelog / SemVer Convention, v0.1.0 — Initial Release, v0.2.0 — Five Themes & Portable Windows Build, v0.3.0 — Search Results Table & Tree Scroll Fix, v0.3.1 — Search Result Value Column Fix, v0.3.2 — XML Declaration Fix, Über Jaxel (About-Dialog), Base64-Inhalte anzeigen (+51 more)

### Community 1 - "npm-Dependencies (editor)"
Cohesion: 0.04
Nodes (47): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, devDependencies (+39 more)

### Community 2 - "Fokus-Ansicht & Byte-Range-Commands"
Cohesion: 0.13
Nodes (22): FocusBreadcrumbProps, captureByteRanges(), clearByteRanges(), restoreByteRanges(), Command, createInsertNodeCommand(), createMoveNodeCommand(), createRemoveNodeCommand() (+14 more)

### Community 3 - "Kickoff-Plan (AP0-AP15)"
Cohesion: 0.06
Nodes (41): AP0 — Gerüst & Doku, AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows (+33 more)

### Community 4 - "Dialoge & i18n-Layer"
Cohesion: 0.07
Nodes (28): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale, useI18n(), AttributesPanel() (+20 more)

### Community 5 - "Tauri-Konfiguration"
Cohesion: 0.06
Nodes (31): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+23 more)

### Community 6 - "JSON-Import/Export"
Cohesion: 0.13
Nodes (26): arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), JsonExportDoc, nodeToJsonText(), objectText(), serializeJson() (+18 more)

### Community 7 - "App.test.tsx Test-Fixtures"
Cohesion: 0.09
Nodes (12): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openSampleFile(), readText (+4 more)

### Community 8 - "Baum-Filter & Änderungsmarker-Flatten"
Cohesion: 0.12
Nodes (12): DisplayRow, TreeRow, withTombstones(), ChangeMarker, DropPosition, DropTarget, EditingField, setDragGhost() (+4 more)

### Community 9 - "tsconfig (editor)"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 10 - "Rust-Backend lib.rs"
Cohesion: 0.23
Nodes (20): AppHandle, FileContent, FileStatResult, log_frontend(), open_decoded_file(), open_log(), PendingOpenPaths, read_text_file() (+12 more)

### Community 11 - "Architektur-Leitprinzipien"
Cohesion: 0.11
Nodes (22): Abweichung vom Ursprungsplan: XML/JSON-Parsing in TypeScript statt Rust/quick-xml, Leitprinzip: Jede Mutation läuft als Command über den CommandBus, packages/core/src (TS): DocNode-Modell, CommandBus/Undo, Parser+Serializer, Pfade, Suche, docs/architektur.md — Architektur-Kurzübersicht, Ein gemeinsames Baummodell (DocNode) für XML und JSON, Leitprinzip: Geparster Baum ist die einzige Wahrheit, Große Dateien: Streaming-Parse + Byte-Offset-Index + virtualisierte Baumansicht, Leitprinzip: Logik React-frei und headless testbar (+14 more)

### Community 12 - "App.tsx Hauptkomponente"
Cohesion: 0.18
Nodes (17): App(), ToastEntry, addRecentFile(), getLastDir(), getRecentFiles(), getSearchDockSide(), getStoredSession(), rememberLastDir() (+9 more)

### Community 13 - "document-store.ts Dokumentverwaltung"
Cohesion: 0.15
Nodes (14): detectFormat(), DocsState, NEW_DOCUMENT_SKELETON, nextUntitledPath(), OpenDocumentState, tabKey(), useJaxelDocuments(), captureChangeBaseline() (+6 more)

### Community 14 - "Fehlerbehandlung & Logging"
Cohesion: 0.14
Nodes (9): ErrorBoundary, Props, State, logError(), logInfo(), LogLevel, logToBackend(), logWarn() (+1 more)

### Community 15 - "AP16 Domain-Glossar (Dirty/Tombstone)"
Cohesion: 0.25
Nodes (18): Anker-Geschwister (Anchor Sibling), Baseline (Domain Term), Änderungsmarker (Change Marker), Dirty (Domain Term), Tombstone (Domain Term), Änderungen im Baum markieren, Bearbeiten (Name/Wert/Attribute/Undo), VS Code Undo-basiertes Dirty-Tracking (externer Vergleich) (+10 more)

### Community 16 - "Grundsatzentscheidungen XML/JSON-Mapping"
Cohesion: 0.14
Nodes (17): XML↔JSON-Vereinheitlichung: DocNode-Konvention, Kodierung: UTF-8/16 + Alt-Encoding-Erkennung, Ausdrücklich NICHT geplant, Badgerfish-Konvention (verworfen), Easy XML Editor (zu ersetzendes Produkt), UI-Sprache: Deutsch + Englisch von Anfang an, Bekannte Einschränkung der JSON-Array-Konvention, Große Dateien: Streaming-Parse + Byte-Offset-Index (+9 more)

### Community 17 - "npm devDependencies"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 18 - "Pfadberechnung (path.ts)"
Cohesion: 0.33
Nodes (11): computePaths(), findAncestorChain(), findNodeById(), formatFullPath(), formatIndexedPath(), formatStaticPath(), getPathSegments(), resolveNodeBySegments() (+3 more)

### Community 19 - "Suche (search.ts)"
Cohesion: 0.25
Nodes (11): CompiledMatcher, compileMatcher(), findAll(), includesAttribute(), includesName(), includesValue(), replaceAll(), SearchMatch (+3 more)

### Community 20 - "tsconfig (core)"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 22 - "Projektrichtlinien (AGENTS.md/CLAUDE.md)"
Cohesion: 0.19
Nodes (14): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Definition of Done Workflow (+6 more)

### Community 23 - "Rust Datei-I/O (io.rs)"
Cohesion: 0.40
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 24 - "package.json Scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 25 - "Settings-Dialog & Settings-Store"
Cohesion: 0.27
Nodes (9): SettingsDialog(), SettingsDialogProps, THEMES, DEFAULTS, load(), Settings, Theme, useSettings() (+1 more)

### Community 26 - "Tauri Capabilities/Permissions"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 27 - "Status-Log AP0-AP7"
Cohesion: 0.20
Nodes (10): AP0 — Gerüst & Doku, AP1 — Modellkern, AP2 — Baumansicht + Datei öffnen, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren, AP5 — Tabs, Grundeinstellungen, AP6 — Linux-Packaging, AP7 — Feinschliff Optik + Bedienung (+2 more)

### Community 28 - "XML-Serialisierung (xml-export.ts)"
Cohesion: 0.40
Nodes (7): escapeAttr(), escapeText(), serializeAttributes(), serializeNode(), serializeNodeMinimal(), serializeXml(), serializeXmlMinimal()

### Community 29 - "Sidebar & Resize-Handle"
Cohesion: 0.25
Nodes (7): RightSidebar(), RightSidebarProps, SidebarTab, getSearchSidebarWidth(), setSearchSidebarWidth(), ResizeHandle(), ResizeHandleProps

### Community 30 - "SearchPanel-Komponente"
Cohesion: 0.31
Nodes (8): CopyPathKind, SearchPanel(), SearchPanelProps, segmentLabel(), stripNamespace(), getSearchPanelHeight(), setSearchPanelHeight(), PathSegment

### Community 31 - "Logo-Konzept Variante B (final)"
Cohesion: 0.32
Nodes (8): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58), Variante B: Markup-Klammern Logo (winning draft)

### Community 32 - "TabBar & Tab-Dirty-Anzeige"
Cohesion: 0.53
Nodes (5): TabState, fileName(), TabBar(), TabBarProps, tabLabel()

### Community 34 - "Kontextmenü-Komponente"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 37 - "Logo-Entwürfe Vorschau (A/B/C)"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 38 - "Logo-Entwurf Variante A (verworfen)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 39 - "Logo-Entwurf Variante C (verworfen)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 42 - "Easy-XML-Editor-Referenz-Screenshot 1"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

## Knowledge Gaps
- **225 isolated node(s):** `Locale`, `catalogs`, `I18nContextValue`, `I18nContext`, `AboutDialogProps` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DocNode` connect `Fokus-Ansicht & Byte-Range-Commands` to `Baum-Filter & Änderungsmarker-Flatten`, `Suche (search.ts)`, `Dialoge & i18n-Layer`, `JSON-Import/Export`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `App()` connect `App.tsx Hauptkomponente` to `App.test.tsx Test-Fixtures`, `document-store.ts Dokumentverwaltung`, `Fehlerbehandlung & Logging`, `Pfadberechnung (path.ts)`, `Settings-Dialog & Settings-Store`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `Locale`, `catalogs`, `I18nContextValue` to the rest of the system?**
  _225 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Release-Historie (CHANGELOG)` be split into smaller, more focused modules?**
  _Cohesion score 0.05727644652250146 - nodes in this community are weakly interconnected._
- **Should `npm-Dependencies (editor)` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Fokus-Ansicht & Byte-Range-Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.13232323232323231 - nodes in this community are weakly interconnected._
- **Should `Kickoff-Plan (AP0-AP15)` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._