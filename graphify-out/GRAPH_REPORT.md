# Graph Report - xml-editor  (2026-09-14)

## Corpus Check
- 141 files · ~138,406 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 983 nodes · 2062 edges · 101 communities (57 shown, 44 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `231d4980`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- index.ts
- document-store.ts
- docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)
- createNode
- tauri.conf.json
- bulk.ts
- App.test.tsx
- lib.rs
- io.rs
- compilerOptions
- theme-colors.test.tsx
- json-import.ts
- docs/architektur.md — Architektur-Kurzübersicht
- App
- JaxelHost
- index.tsx
- Entscheidungslog — Jaxel
- Ist-Stand — Jaxel (status.md)
- search.ts
- compilerOptions
- devDependencies
- base64.ts
- local-prefs.ts
- core/package.json
- dependencies
- Jaxel 0.1.0 — Erste Veröffentlichung
- package.json
- default.json
- CHANGELOG.md
- selection.ts
- shortcuts.test.ts
- Jaxel Project Identity
- scripts
- Jaxel-Logo SVG (Variante B: Markup-Klammern)
- Jaxel 0.3.0 — Trefferliste als Tabelle
- Änderungen im Baum markieren
- MenuBar.tsx
- Build Job: Linux/Windows Matrix
- release.mjs
- editor/package.json
- ContextMenu.tsx
- Toast.tsx
- tauri-close-capabilities.test.ts
- scroll-math.ts
- Logo-Entwuerfe Vorschau (Composite: A/B/C)
- Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat)
- Variante C: J-Monogramm (Logo-Entwurf, verworfen)
- IconButton.tsx
- ResizeHandle.tsx
- Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table)
- Absturz- und Fehler-Logging (AP15): Frontend-Logging-Brücke, Rust nur Fehlschläge
- ErrorBoundary.tsx
- apps/editor/index.html (HTML-Einstiegspunkt)
- logging.ts
- @testing-library/user-event
- Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker
- RightSidebar.tsx
- @types/react-dom
- errors.ts
- @vitest/browser-playwright
- Screenshot: Easy XML Editor Kontextmenue auf XML-Baumknoten
- Baseline (Domain Term)
- Base64-Inhalte anzeigen
- Fokus-Ansicht ab einem Knoten
- Tastenkürzel-Tabelle
- Plan: Search Focus and Toast Notifications
- icon-source.png (placeholder app icon)
- App-Icon 256x256px (128@2x)
- App-Icon 128x128px
- App-Icon 32x32px
- App-Icon 64x64px
- App-Icon 512x512px (Haupt-Icon)
- Windows Square-Logo 107x107px
- Windows Square-Logo 142x142px
- Windows Square-Logo 150x150px
- Windows Square-Logo 284x284px
- Windows Square-Logo 30x30px
- Windows Square-Logo 310x310px
- Windows Square-Logo 44x44px
- Windows Square-Logo 71x71px
- Windows Square-Logo 89x89px
- Windows StoreLogo 50x50px
- Base64PreviewDialog.tsx
- CloseConfirmDialog.tsx
- Über Jaxel (About-Dialog)
- Pfad kopieren (drei Notationen)
- Status- und Fehlermeldungen (Toasts)
- Plan: Reload-Dialog Fokus- und Dateistandbehandlung
- jaxel
- @testing-library/jest-dom
- @testing-library/react
- vite
- @vitest/browser
- main.tsx

## God Nodes (most connected - your core abstractions)
1. `App()` - 67 edges
2. `DocNode` - 63 edges
3. `createNode()` - 42 edges
4. `parseXml()` - 31 edges
5. `Ist-Stand — Jaxel (status.md)` - 31 edges
6. `Entscheidungslog — Jaxel` - 29 edges
7. `CommandBus` - 28 edges
8. `JaxelHost` - 24 edges
9. `useJaxelDocuments()` - 22 edges
10. `Command` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker` --rationale_for--> `withTombstones()`  [EXTRACTED]
  docs/entscheidungen.md → apps/editor/src/tree/flatten.ts
- `Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker` --rationale_for--> `captureChangeBaseline()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/changes/diff.ts
- `saveFile/saveFileAs (apps/editor/src/state/document-store.ts)` --calls--> `syncByteRangesAfterSave()`  [EXTRACTED]
  docs/status.md → packages/core/src/commands/byte-range.ts
- `Byte-Offsets nach dem Speichern auffrischen (syncByteRangesAfterSave)` --rationale_for--> `syncByteRangesAfterSave()`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/commands/byte-range.ts
- `Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker` --rationale_for--> `CommandBus`  [EXTRACTED]
  docs/entscheidungen.md → packages/core/src/commands/command-bus.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]
- **Base64 decode-view feature (heuristic, decoder, AP13 implementation)** — docs_entscheidungen_base64_decode_ansicht, packages_core_src_format_base64_decodebase64, packages_core_src_format_base64_lookslikebase64, docs_status_ap13 [EXTRACTED 1.00]
- **byteRange lifecycle: minimal-invasive save, refresh-after-save, save-epoch invalidation** — docs_entscheidungen_byte_offset_refresh, docs_entscheidungen_save_epoche, packages_core_src_commands_command_bus_commandbus, packages_core_src_commands_byte_range_syncbyterangesaftersave, packages_core_src_format_xml_export_serializexmlminimal [EXTRACTED 1.00]
- **External file change detection and safe reload decision flow** — docs_entscheidungen_externe_aenderungen_reload, docs_entscheidungen_reload_sichere_entscheidung, apps_editor_src_ui_reloaddialog, docs_status_ap9 [EXTRACTED 1.00]
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]

## Communities (101 total, 44 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.26
Nodes (9): ToastEntry, buildFilterKeepSet(), flattenFiltered(), flattenTree(), ArrowIntent, nextSelectedRow(), planArrowLeft(), planArrowRight() (+1 more)

### Community 1 - "index.ts"
Cohesion: 0.05
Nodes (76): OpenDocumentState, FocusBreadcrumbProps, ConvertDialogProps, NewDocumentDialogProps, captureByteRanges(), clearByteRanges(), restoreByteRanges(), ByteRangeSnapshot (+68 more)

### Community 2 - "document-store.ts"
Cohesion: 0.11
Nodes (30): logInfo(), detectFormat(), DocsState, formatOfExtension(), NEW_DOCUMENT_SKELETON, nextUntitledPath(), persistSaved(), saveFile/saveFileAs (apps/editor/src/state/document-store.ts) (+22 more)

### Community 3 - "docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)"
Cohesion: 0.06
Nodes (40): AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows, AP8 (optional/später) — macOS-Bundle, Namespace-Dialog, Maskottchen (+32 more)

### Community 4 - "createNode"
Cohesion: 0.09
Nodes (32): computeDropAllowed(), positionFromRatio(), DisplayRow, sampleTree(), TreeRow, withTombstones(), SelectModifier, selectModifierOf() (+24 more)

### Community 5 - "tauri.conf.json"
Cohesion: 0.06
Nodes (32): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+24 more)

### Community 6 - "bulk.ts"
Cohesion: 0.29
Nodes (14): BulkRow, createBulkDuplicateCommand(), createBulkInsertCommand(), createBulkMoveCommand(), createBulkRemoveCommand(), removableSlotsDescending(), topmostRows(), createCompositeCommand() (+6 more)

### Community 7 - "App.test.tsx"
Cohesion: 0.08
Nodes (13): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openCommentedFile(), openJsonFile() (+5 more)

### Community 8 - "lib.rs"
Cohesion: 0.24
Nodes (22): AppHandle, bring_main_window_to_front(), FileContent, FileStatResult, log_frontend(), log_io_error(), open_decoded_file(), open_log() (+14 more)

### Community 9 - "io.rs"
Cohesion: 0.17
Nodes (13): DecodedFile, detect_encoding(), FileStat, read_text_file(), Result, String, sniff_xml_declared_encoding(), stat_file() (+5 more)

### Community 10 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 11 - "theme-colors.test.tsx"
Cohesion: 0.18
Nodes (7): Theme, contrastRatio(), luminance(), THEMES, ROWS, SampleRow, THEMES

### Community 12 - "json-import.ts"
Cohesion: 0.18
Nodes (15): arrayElementToNode(), JArray, JBoolean, JNull, JNumber, JObject, JsonSyntaxError, jsonTypeOf() (+7 more)

### Community 13 - "docs/architektur.md — Architektur-Kurzübersicht"
Cohesion: 0.11
Nodes (22): Abweichung vom Ursprungsplan: XML/JSON-Parsing in TypeScript statt Rust/quick-xml, Leitprinzip: Jede Mutation läuft als Command über den CommandBus, packages/core/src (TS): DocNode-Modell, CommandBus/Undo, Parser+Serializer, Pfade, Suche, docs/architektur.md — Architektur-Kurzübersicht, Ein gemeinsames Baummodell (DocNode) für XML und JSON, Leitprinzip: Geparster Baum ist die einzige Wahrheit, Große Dateien: Streaming-Parse + Byte-Offset-Index + virtualisierte Baumansicht, Leitprinzip: Logik React-frei und headless testbar (+14 more)

### Community 14 - "App"
Cohesion: 0.26
Nodes (11): App(), isTextInput(), resolveShortcut(), commentOutBlocker, containsComment(), containsDoubleHyphen(), createCommentOutCommand(), createUncommentCommand() (+3 more)

### Community 15 - "JaxelHost"
Cohesion: 0.05
Nodes (11): createVscodeHost(), HostFileContent, HostFileDropEvent, HostFileStat, HostMode, JaxelHost, Message, randomRequestId() (+3 more)

### Community 16 - "index.tsx"
Cohesion: 0.29
Nodes (6): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale

### Community 17 - "Entscheidungslog — Jaxel"
Cohesion: 0.15
Nodes (19): Entscheidungslog — Jaxel, Arbeitsmodus: autonom bis zum ersten lauffähigen Linux-Editor (AP0-AP5), Baum-Drag&Drop-Transparenz via eigenes halbtransparentes Drag-Bild, Kodierung: UTF-8/UTF-16 + Auto-Erkennung Alt-Encodings via encoding_rs, Erkennung externer Dateiänderungen + Reload nur bei Fenster-Fokus, Fokus-Ansicht: virtuelles Dokument ab Knoten X auf demselben lebenden Baum, Keine XSD/DTD-Schemavalidierung — auch nicht als spätere Ausbaustufe, Namespaces: V1 erhält sie nur korrekt, kein Verwaltungsdialog (+11 more)

### Community 18 - "Ist-Stand — Jaxel (status.md)"
Cohesion: 0.19
Nodes (14): Jaxel 0.2.0 — Fünf Themes, portabler Windows-Build, Priorisierung der Desktop-Reife-Lücken (Ungespeichert-Warnung, Öffnen-mit, Sitzung wiederherstellen), Strg+F als Fokus-Shortcut (kein Toggle) + layoutstabile Toast-Meldungen, Ist-Stand — Jaxel (status.md), AP10 — Ungespeichert-Warnung beim Tab- und Fenster-Schließen, AP11 — 'Öffnen mit' bei laufender App: Weiterleitung an laufende Instanz, AP12 — Sitzung wiederherstellen, AP13 — Base64-Decode-Ansicht (+6 more)

### Community 19 - "search.ts"
Cohesion: 0.14
Nodes (23): CopyPathKind, SearchPanel(), SearchPanelProps, segmentLabel(), stripNamespace(), wrapIndex(), getSearchPanelHeight(), SearchDockSide (+15 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+8 more)

### Community 21 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, playwright, @tauri-apps/cli, @types/node, @types/react, typescript, @vitejs/plugin-react, vitest (+7 more)

### Community 22 - "base64.ts"
Cohesion: 0.18
Nodes (12): AttributesPanel(), AttributesPanelProps, Base64-Decode-Ansicht: Heuristik + Kontextmenü-Fallback, read-only, B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedContentKind, detectTextFormat() (+4 more)

### Community 23 - "local-prefs.ts"
Cohesion: 0.11
Nodes (25): SettingsDialogProps, THEMES, addRecentFile(), getLastDir(), getRecentFiles(), getSearchDockSide(), getStoredSession(), normalizeRecentFilesLimit() (+17 more)

### Community 24 - "core/package.json"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, @types/node, typescript, vitest, main (+7 more)

### Community 25 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, @jaxel/core (+5 more)

### Community 26 - "Jaxel 0.1.0 — Erste Veröffentlichung"
Cohesion: 0.15
Nodes (13): Jaxel 0.1.0 — Erste Veröffentlichung, XML↔JSON-Vereinheitlichung: eigenes DocNode-Modell statt Badgerfish, Bekannte Einschränkung: Ein-Element-Arrays nicht von Einzelwert unterscheidbar, Große Dateien: Streaming-Parse + Byte-Offset-Index, virtualisierte Baumansicht, Multi-Window: Tabs als Standard, echte OS-Fenster optional, AP1 — Modellkern (DocNode, CommandBus, XML/JSON-Parser), AP2 — Baumansicht + Datei öffnen, AP3 — Editieren (Wert/Name/Attribute, Undo/Redo, Einfügen/Löschen) (+5 more)

### Community 27 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 28 - "default.json"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 29 - "CHANGELOG.md"
Cohesion: 0.22
Nodes (8): Jaxel 0.3.1 — Suchtreffer-Wert-Spalte-Fix, Jaxel 0.3.2 — XML-Deklaration ging verloren, Jaxel 0.4.0 — Ungespeicherte Änderungen sichtbar, Jaxel 0.4.1 — Baum kollabierte beim Tab-Wechsel, AP16 — Ungespeicherte Änderungen sichtbar machen, Nachtrag 2026-07-22 — Suchtreffer-Tabelle: Wert-Spalte zeigt Elementinhalt statt Namen, Nachtrag 2026-07-22 — Baum kollabierte beim Tab-Wechsel, Kritischer Fix 2026-07-22 — Minimal-invasives Speichern verlor die XML-Deklaration

### Community 30 - "selection.ts"
Cohesion: 0.24
Nodes (11): EMPTY_SELECTION, extendSelection(), pruneSelection(), selectedRowsInOrder(), Selection, selectionForActionOn(), selectOnly(), selectRange() (+3 more)

### Community 31 - "shortcuts.test.ts"
Cohesion: 0.28
Nodes (7): ShortcutAction, ShortcutContext, ShortcutKeyInfo, branchSelected, key(), leafSelected, noSelection

### Community 32 - "Jaxel Project Identity"
Cohesion: 0.29
Nodes (8): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Zentrale Invarianten (7 Core Invariants)

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, preview, tauri, test, test:visual, typecheck

### Community 34 - "Jaxel-Logo SVG (Variante B: Markup-Klammern)"
Cohesion: 0.22
Nodes (9): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, AboutDialogProps, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58) (+1 more)

### Community 35 - "Jaxel 0.3.0 — Trefferliste als Tabelle"
Cohesion: 0.22
Nodes (7): ReloadDialogProps, Jaxel 0.3.0 — Trefferliste als Tabelle, Sichere Entscheidung bei externen Dateiänderungen: explizite Reload-Wahl, Nachtrag 2026-07-21 — Reload-Dialog bei externen Änderungen, Nachtrag 2026-07-21 — Baum: Scroll-Position bleibt beim Auf-/Zuklappen erhalten, Nachtrag 2026-07-21 — Tastaturnavigation Trefferliste, ziehbares/andockbares Suchpanel, Nachtrag 2026-07-21 — Trefferliste als Tabelle: Namespace-Kürzung, Pfad-Kürzung, Kontextmenü

### Community 36 - "Änderungen im Baum markieren"
Cohesion: 0.38
Nodes (7): Anker-Geschwister (Anchor Sibling), Änderungsmarker (Change Marker), Tombstone (Domain Term), Änderungen im Baum markieren, Bearbeiten (Name/Wert/Attribute/Undo), Extern geänderte Dateien / Reload, Einstellungen

### Community 37 - "MenuBar.tsx"
Cohesion: 0.33
Nodes (4): MenuBarEntry, MenuBarMenu, MenuBarProps, MenuHeading

### Community 38 - "Build Job: Linux/Windows Matrix"
Cohesion: 0.40
Nodes (6): Build Job: Linux/Windows Matrix, Check Job: Tests & Versionscheck, Portable Windows ZIP Packaging Step, tauri-apps/tauri-action Usage, Tag-Version Consistency Gate, Release Workflow (GitHub Actions)

### Community 39 - "release.mjs"
Cohesion: 0.33
Nodes (3): branch, existingTags, rl

### Community 40 - "editor/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 41 - "ContextMenu.tsx"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 45 - "Logo-Entwuerfe Vorschau (Composite: A/B/C)"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 46 - "Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 47 - "Variante C: J-Monogramm (Logo-Entwurf, verworfen)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 50 - "Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table)"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

### Community 51 - "Absturz- und Fehler-Logging (AP15): Frontend-Logging-Brücke, Rust nur Fehlschläge"
Cohesion: 1.00
Nodes (3): Absturz- und Fehler-Logging (AP15): Frontend-Logging-Brücke, Rust nur Fehlschläge, Datenschutz-Invariante Logging: nur Pfade, Fehlermeldungen, Metadaten, AP15 — Absturz- und Fehler-Logging

### Community 52 - "ErrorBoundary.tsx"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 54 - "logging.ts"
Cohesion: 0.43
Nodes (7): getJaxelHost(), describeError(), installGlobalErrorLogging(), logError(), LogLevel, logToBackend(), logWarn()

### Community 56 - "Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker"
Cohesion: 0.33
Nodes (7): Unreleased (2 kritische XML-Speicher-Bugs), Byte-Offsets nach dem Speichern auffrischen (syncByteRangesAfterSave), Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker, Round-Trip: format-erhaltend, best effort, Save-Epoche: byteRange-Invalidierung im CommandBus zentralisiert, Nachtrag 2026-07-24 — byteRange-Invalidierung zentralisiert (Save-Epoche), Nachtrag 2026-07-24 — Zweites Speichern konnte die XML zerstören (kritischer Fix)

### Community 57 - "RightSidebar.tsx"
Cohesion: 0.47
Nodes (5): RightSidebar(), RightSidebarProps, SidebarTab, getSearchSidebarWidth(), setSearchSidebarWidth()

## Knowledge Gaps
- **265 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ist-Stand — Jaxel (status.md)` connect `Ist-Stand — Jaxel (status.md)` to `Jaxel 0.3.0 — Trefferliste als Tabelle`, `Entscheidungslog — Jaxel`, `Absturz- und Fehler-Logging (AP15): Frontend-Logging-Brücke, Rust nur Fehlschläge`, `Sichtbare Kennzeichnung ungespeicherter Änderungen: Tab-Punkt + Baum-Marker`, `Jaxel 0.1.0 — Erste Veröffentlichung`, `CHANGELOG.md`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `AP0 — Gerüst & Doku` connect `Entscheidungslog — Jaxel` to `Ist-Stand — Jaxel (status.md)`, `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `Roadmap Arbeitspakete AP0–AP8` connect `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` to `Entscheidungslog — Jaxel`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `key()` and `getSearchDockSide()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05206097037355088 - nodes in this community are weakly interconnected._
- **Should `document-store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10953058321479374 - nodes in this community are weakly interconnected._