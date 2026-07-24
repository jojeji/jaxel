# Graph Report - .  (2026-07-24)

## Corpus Check
- 14 files · ~95,061 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 763 nodes · 1042 edges · 81 communities (40 shown, 41 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.79)
- Token cost: 144,281 input · 0 output

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
- Rust main.rs
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
- About-Dialog
- Pfad kopieren (drei Notationen)
- Toast-Benachrichtigungen
- Kickoff: Autonomer Start bis lauffähiger Linux-Editor
- Encoding-Erkennung (UTF-8/UTF-16/ISO-8859-1/Windows-1252)
- i18n: Deutsch + Englisch
- Namespace-Handling (V1-Scope)
- AP7: Feinschliff Optik + Bedienung
- AP8: Kontextmenü, Pfad, Attribute, DnD, Logo
- Hotkey-Korrektur Strg+Plus
- Tooling: VS-Code-Tasks/Launch, CHANGELOG
- Plan: Reload-Dialog Fokus-/Dateistandbehandlung

## God Nodes (most connected - your core abstractions)
1. `DocNode` - 22 edges
2. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 17 edges
3. `CommandBus` - 16 edges
4. `captureByteRanges()` - 16 edges
5. `compilerOptions` - 15 edges
6. `Geplante Monorepo-Struktur (npm-Workspaces, gespiegelt an xdp-designer)` - 13 edges
7. `useI18n()` - 11 edges
8. `Command` - 11 edges
9. `createNode()` - 11 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Baum-Änderungsmarker: optionales, standardmäßig ausgeschaltetes Setting` --rationale_for--> `computeChanges()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/changes/diff.ts
- `AP16: Ungespeicherte Änderungen sichtbar machen` --references--> `computeChanges()`  [EXTRACTED]
  docs/status.md → packages/core/src/changes/diff.ts
- `isDirty mit echter Speicher-Baseline statt reinem Flag (CommandBus.markSaved)` --rationale_for--> `CommandBus`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/commands/command-bus.ts
- `syncByteRangesAfterSave: byteRange-Werte nach Speichern auffrischen statt verwerfen` --rationale_for--> `syncByteRangesAfterSave()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/commands/byte-range.ts
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Suchfunktion-Weiterentwicklung über mehrere Releases (AP4 bis Toasts)** — docs_status_ap4_search_replace_path_copy, docs_status_search_value_column_bug, docs_status_search_table_namespace_truncation, docs_status_search_keyboard_nav_dockable_panel, docs_status_ctrl_f_reliable_toasts [INFERRED 0.85]
- **Erkennung externer Dateiänderungen und Reload-Dialog-Flow** — docs_entscheidungen_external_change_detection, docs_status_ap9_focus_view_etc, docs_entscheidungen_reload_dialog_safety, docs_status_reload_dialog_fix [INFERRED 0.85]
- **Sichtbarkeit ungespeicherter Änderungen (Tab-Punkt, Baseline, Baum-Marker, Tombstone)** — docs_entscheidungen_tab_dirty_dot, docs_entscheidungen_isdirty_baseline, docs_entscheidungen_tree_change_markers, docs_entscheidungen_tombstone, docs_status_ap16_unsaved_changes_visible [INFERRED 0.90]
- **Reload Dialog Feature: Decision → Plan → Implementation** — docs_superpowers_plans_2026_07_21_reload_dialog_focus_plan, docs_entscheidungen_reload_dialog_explicit_choice, docs_entscheidungen_reload_dialog_focus_follows_dirty, docs_entscheidungen_reload_dialog_async_safety, docs_entscheidungen_reload_dialog_no_dialog_stacking, docs_status_nachtrag_reload_dialog_external_changes [EXTRACTED 1.00]
- **Search Focus & Toast Feature: Spec → Plan → Decision → Implementation → Release** — docs_superpowers_specs_2026_07_21_search_focus_toast_design_spec, docs_superpowers_plans_2026_07_21_search_focus_toast_plan, docs_entscheidungen_search_focus_shortcut, docs_entscheidungen_toast_notifications, docs_entscheidungen_toast_timing, docs_status_nachtrag_ctrlf_and_toasts, changelog_v0_3_0 [EXTRACTED 1.00]
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (81 total, 41 thin omitted)

### Community 0 - "Release-Historie (CHANGELOG)"
Cohesion: 0.13
Nodes (22): FocusBreadcrumbProps, captureByteRanges(), clearByteRanges(), restoreByteRanges(), Command, createInsertNodeCommand(), createMoveNodeCommand(), createRemoveNodeCommand() (+14 more)

### Community 1 - "npm-Dependencies (editor)"
Cohesion: 0.05
Nodes (43): 0.1.0 — Initial Release: XML/JSON-Baumeditor, Anker-Geschwister (Anchor Sibling), Änderungsmarker (Change Marker), Tombstone (Domain Term), Base64-Inhalte anzeigen, Änderungen im Baum markieren, Bearbeiten (Name/Wert/Attribute/Undo), Extern geänderte Dateien / Reload (+35 more)

### Community 2 - "Fokus-Ansicht & Byte-Range-Commands"
Cohesion: 0.07
Nodes (30): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), RightSidebar(), RightSidebarProps, SidebarTab, CopyPathKind, SearchPanel() (+22 more)

### Community 3 - "Kickoff-Plan (AP0-AP15)"
Cohesion: 0.06
Nodes (41): AP0 — Gerüst & Doku, AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows (+33 more)

### Community 4 - "Dialoge & i18n-Layer"
Cohesion: 0.08
Nodes (22): DisplayRow, flattenTree(), TreeRow, withTombstones(), ChangeMarker, DropPosition, DropTarget, EditingField (+14 more)

### Community 5 - "Tauri-Konfiguration"
Cohesion: 0.06
Nodes (31): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+23 more)

### Community 6 - "JSON-Import/Export"
Cohesion: 0.14
Nodes (25): arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), JsonExportDoc, nodeToJsonText(), objectText(), serializeJson() (+17 more)

### Community 7 - "App.test.tsx Test-Fixtures"
Cohesion: 0.10
Nodes (19): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale, useI18n(), AttributesPanel() (+11 more)

### Community 8 - "Baum-Filter & Änderungsmarker-Flatten"
Cohesion: 0.08
Nodes (24): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, name (+16 more)

### Community 9 - "tsconfig (editor)"
Cohesion: 0.13
Nodes (19): App(), ToastEntry, container, detectFormat(), DocsState, NEW_DOCUMENT_SKELETON, nextUntitledPath(), OpenDocumentState (+11 more)

### Community 10 - "Rust-Backend lib.rs"
Cohesion: 0.09
Nodes (12): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openSampleFile(), readText (+4 more)

### Community 11 - "Architektur-Leitprinzipien"
Cohesion: 0.09
Nodes (23): devDependencies, jsdom, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/react, @types/react-dom (+15 more)

### Community 12 - "App.tsx Hauptkomponente"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 13 - "document-store.ts Dokumentverwaltung"
Cohesion: 0.23
Nodes (20): AppHandle, FileContent, FileStatResult, log_frontend(), open_decoded_file(), open_log(), PendingOpenPaths, read_text_file() (+12 more)

### Community 14 - "Fehlerbehandlung & Logging"
Cohesion: 0.11
Nodes (22): Abweichung vom Ursprungsplan: XML/JSON-Parsing in TypeScript statt Rust/quick-xml, Leitprinzip: Jede Mutation läuft als Command über den CommandBus, packages/core/src (TS): DocNode-Modell, CommandBus/Undo, Parser+Serializer, Pfade, Suche, docs/architektur.md — Architektur-Kurzübersicht, Ein gemeinsames Baummodell (DocNode) für XML und JSON, Leitprinzip: Geparster Baum ist die einzige Wahrheit, Große Dateien: Streaming-Parse + Byte-Offset-Index + virtualisierte Baumansicht, Leitprinzip: Logik React-frei und headless testbar (+14 more)

### Community 15 - "AP16 Domain-Glossar (Dirty/Tombstone)"
Cohesion: 0.13
Nodes (6): 0.4.0 — Ungespeicherte Änderungen sichtbar (Tab-Punkt + Baum-Marker), isDirty mit echter Speicher-Baseline statt reinem Flag (CommandBus.markSaved), Tab-Kennzeichnung: Punkt statt Schließen-Icon (VS-Code-Stil), Tombstone-Zeile: gelöschte Knoten bleiben an Anker-Geschwister-Position sichtbar, AP16: Ungespeicherte Änderungen sichtbar machen, CommandBus

### Community 16 - "Grundsatzentscheidungen XML/JSON-Mapping"
Cohesion: 0.23
Nodes (12): CompiledMatcher, compileMatcher(), findAll(), includesAttribute(), includesName(), includesValue(), replaceAll(), SearchMatch (+4 more)

### Community 17 - "npm devDependencies"
Cohesion: 0.17
Nodes (8): ErrorBoundary, Props, State, logError(), logInfo(), LogLevel, logToBackend(), logWarn()

### Community 18 - "Pfadberechnung (path.ts)"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 19 - "Suche (search.ts)"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 20 - "tsconfig (core)"
Cohesion: 0.27
Nodes (11): computePaths(), findAncestorChain(), findNodeById(), formatFullPath(), formatIndexedPath(), formatStaticPath(), getPathSegments(), resolveNodeBySegments() (+3 more)

### Community 21 - "CommandBus Undo/Redo/Baseline"
Cohesion: 0.19
Nodes (14): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Definition of Done Workflow (+6 more)

### Community 22 - "Projektrichtlinien (AGENTS.md/CLAUDE.md)"
Cohesion: 0.40
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 23 - "Rust Datei-I/O (io.rs)"
Cohesion: 0.15
Nodes (13): 0.3.0 — Trefferliste als Tabelle, Suchpanel-Features, Toasts, 0.3.1 — Suchtreffer-Wert-Spalte zeigt Elementinhalt (Fix), 0.4.1 — Baum kollabierte beim Tab-Wechsel (Fix), Strg+F ist ein Fokus-Shortcut, kein Toggle, Kurzlebige Rückmeldungen außerhalb des Layoutflusses (Toast-Stapel), Sichere Entscheidung bei externen Dateiänderungen: expliziter Reload-Dialog, Zuverlässiges Strg+F und schwebende Meldungen (Toasts), Reload-Dialog bei externen Dateiänderungen: Backdrop-Klick-Bug behoben (+5 more)

### Community 24 - "package.json Scripts"
Cohesion: 0.27
Nodes (10): 0.3.2 — XML-Deklaration ging beim Speichern verloren (Fix), Round-Trip: format-erhaltend, best effort (kein Byte-Identität-Invariant), Kritischer Fix: minimal-invasives Speichern verlor die XML-Deklaration, escapeAttr(), escapeText(), serializeAttributes(), serializeNode(), serializeNodeMinimal() (+2 more)

### Community 25 - "Settings-Dialog & Settings-Store"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 26 - "Tauri Capabilities/Permissions"
Cohesion: 0.24
Nodes (9): B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedBase64, DecodedContentKind, detectTextFormat(), EXTENSIONS, sniffKind() (+1 more)

### Community 27 - "Status-Log AP0-AP7"
Cohesion: 0.27
Nodes (8): SettingsDialogProps, THEMES, DEFAULTS, load(), Settings, Theme, useSettings(), WindowMode

### Community 28 - "XML-Serialisierung (xml-export.ts)"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 30 - "SearchPanel-Komponente"
Cohesion: 0.40
Nodes (6): Build Job: Linux/Windows Matrix, Check Job: Tests & Versionscheck, Portable Windows ZIP Packaging Step, tauri-apps/tauri-action Usage, Tag-Version Consistency Gate, Release Workflow (GitHub Actions)

### Community 31 - "Logo-Konzept Variante B (final)"
Cohesion: 0.33
Nodes (3): branch, existingTags, rl

### Community 32 - "TabBar & Tab-Dirty-Anzeige"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 35 - "Toast-Benachrichtigungen"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 36 - "Tauri Close-Capabilities-Test"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 37 - "Logo-Entwürfe Vorschau (A/B/C)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 40 - "Test-Setup Polyfills"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

### Community 41 - "IconButton-Komponente"
Cohesion: 0.67
Nodes (3): 0.2.0 — Fünf neue Themes, portabler Windows-Build, Fünf neue Themes (Nordlicht, Tanne, Terrakotta, Kobalt, Kontrast), GitHub-Actions-Release-Workflow (Linux+Windows)

## Knowledge Gaps
- **256 isolated node(s):** `Locale`, `catalogs`, `I18nContextValue`, `I18nContext`, `AboutDialogProps` (+251 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DocNode` connect `Release-Historie (CHANGELOG)` to `Grundsatzentscheidungen XML/JSON-Mapping`, `Dialoge & i18n-Layer`, `JSON-Import/Export`, `App.test.tsx Test-Fixtures`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `App()` connect `tsconfig (editor)` to `Rust-Backend lib.rs`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `CommandBus` connect `AP16 Domain-Glossar (Dirty/Tombstone)` to `Release-Historie (CHANGELOG)`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Locale`, `catalogs`, `I18nContextValue` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Release-Historie (CHANGELOG)` be split into smaller, more focused modules?**
  _Cohesion score 0.13140096618357489 - nodes in this community are weakly interconnected._
- **Should `npm-Dependencies (editor)` be split into smaller, more focused modules?**
  _Cohesion score 0.05204872646733112 - nodes in this community are weakly interconnected._
- **Should `Fokus-Ansicht & Byte-Range-Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.06951219512195123 - nodes in this community are weakly interconnected._