# Graph Report - .  (2026-07-18)

## Corpus Check
- Corpus is ~40,203 words - fits in a single context window. You may not need a graph.

## Summary
- 575 nodes · 1002 edges · 52 communities (34 shown, 18 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.86)
- Token cost: 176,657 input · 0 output

## Community Hubs (Navigation)
- Dokument-State & Byte-Range-Invalidierung
- App.tsx: UI-Hauptkomponente
- Kickoff-Plan: Grundsatzentscheidungen
- Kern-Invarianten (Baum, CommandBus, DocNode)
- JSON-Export-Serialisierung
- App.tsx: Interaktionstests
- Tauri-Fensterkonfiguration
- Editor-Paket: Dependencies
- Editor-Paket: Dev-/Test-Tooling
- Editor-Paket: TSConfig
- AP-Roadmap (AP0, AP2–AP6)
- Suchpanel & Suchlogik
- Core-Paket: Dependencies
- Core-Paket: TSConfig
- Kickoff: Monorepo-Architekturentwurf
- Rust: Tauri-Commands (lib.rs)
- Root-Workspace (package.json)
- Rust: Encoding-Erkennung (io.rs)
- AP7: Feinschliff & Windows-Packaging
- Pfadberechnung (indiziert/statisch/voll)
- AP8: Kontextmenü, DnD, Attribut-Editing
- XML-Export-Serialisierung
- Tauri-Capabilities
- CHANGELOG & VS-Code-Tooling
- Gewaehltes Logo (Variante B) + App-Icons
- Benutzerhandbuch: Bedienung
- Logo-Entwuerfe: Vorschau-Composite
- Verworfener Logo-Entwurf A (Knotenbaum)
- Verworfener Logo-Entwurf C (Monogramm)
- Easy-XML-Editor-Referenz (Baum/Tabelle)
- Vite/React-Einstiegspunkt
- Easy-XML-Editor-Referenz (Kontextmenü)
- Platzhalter-App-Icon (AP0)
- Generiertes App-Icon 256px
- Generiertes App-Icon 128px
- Generiertes App-Icon 32px
- Generiertes App-Icon 64px
- Generiertes App-Icon 512px
- Windows-Icon 107px
- Windows-Icon 142px
- Windows-Icon 150px
- Windows-Icon 284px
- Windows-Icon 30px
- Windows-Icon 310px
- Windows-Icon 44px
- Windows-Icon 71px
- Windows-Icon 89px
- Windows-StoreLogo 50px

## God Nodes (most connected - your core abstractions)
1. `DocNode` - 31 edges
2. `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` - 21 edges
3. `docs/entscheidungen.md — Entscheidungslog` - 20 edges
4. `Command` - 17 edges
5. `createNode()` - 17 edges
6. `docs/status.md — Ist-Stand je Arbeitspaket` - 17 edges
7. `captureByteRanges()` - 16 edges
8. `CommandBus` - 16 edges
9. `CLAUDE.md — Arbeitsanweisung für KI-Agenten` - 16 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen` --semantically_similar_to--> `Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `.vscode/tasks.json und launch.json (von xdp-designer übernommen, angepasst)` --semantically_similar_to--> `.vscode/tasks.json und launch.json (Prüfkette, Release-Tasks)`  [INFERRED] [semantically similar]
  docs/status.md → README.md
- `Unreleased: XML/JSON-Baumeditor, Bearbeiten, Tastaturbedienung, Suchen/Ersetzen, Pfad kopieren, Kontextmenü, Tabs, Startscreen, Logo, Linux-Pakete` --conceptually_related_to--> `docs/benutzerhandbuch.md — Benutzerhandbuch Jaxel`  [INFERRED]
  CHANGELOG.md → docs/benutzerhandbuch.md
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts
- `OpenDocumentState` --references--> `CommandBus`  [EXTRACTED]
  apps/editor/src/state/document-store.ts → packages/core/src/commands/command-bus.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zentrale Architektur-Invarianten von Jaxel (Leitprinzipien)** — docs_architektur_geparster_baum, docs_architektur_commandbus, docs_architektur_minimal_invasives_speichern, docs_architektur_headless_testbar, docs_architektur_docnode_gemeinsam [EXTRACTED 1.00]
- **Pflicht-Selbstdokumentation von Jaxel** — docs_architektur_doc, docs_entscheidungen_doc, docs_status_doc, docs_benutzerhandbuch_doc [EXTRACTED 1.00]
- **Kickoff-Grilling-Entscheidungen (2026-07-17)** — docs_entscheidungen_roundtrip, docs_entscheidungen_stack, docs_entscheidungen_grosse_dateien, docs_entscheidungen_xml_json_modell, docs_entscheidungen_multi_window, docs_entscheidungen_namespaces, docs_entscheidungen_plattform_reihenfolge, docs_entscheidungen_pakete, docs_entscheidungen_kodierung, docs_entscheidungen_keine_validierung, docs_entscheidungen_sprache, docs_entscheidungen_produktname, docs_entscheidungen_arbeitsmodus [EXTRACTED 1.00]
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]

## Communities (52 total, 18 thin omitted)

### Community 0 - "Dokument-State & Byte-Range-Invalidierung"
Cohesion: 0.12
Nodes (29): detectFormat(), DocsState, useJaxelDocuments(), captureByteRanges(), clearByteRanges(), restoreByteRanges(), CommandBus, Command (+21 more)

### Community 1 - "App.tsx: UI-Hauptkomponente"
Cohesion: 0.06
Nodes (40): App(), useI18n(), AttributesPanel(), AttributesPanelProps, SearchPanel(), SettingsDialog(), SettingsDialogProps, OpenDocumentState (+32 more)

### Community 2 - "Kickoff-Plan: Grundsatzentscheidungen"
Cohesion: 0.08
Nodes (38): AP1 — Modellkern (core), Delegationsstrategie: kleinere Subagenten für abgegrenzte, testgetriebene Pakete, docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis), Easy XML Editor (Vorgänger-Tool ohne Linux-Support), Entscheidung: Große Dateien via Streaming-Parse + Index, Jaxel — Produktname (JSON + XML), Binärname jaxel, Slogan 'Ein Baum, zwei Formate', Jaxolotl (optionales Maskottchen, Axolotl), Entscheidung: Kodierung UTF-8/UTF-16 + Auto-Erkennung via encoding_rs (+30 more)

### Community 3 - "Kern-Invarianten (Baum, CommandBus, DocNode)"
Cohesion: 0.09
Nodes (29): apps/editor (Vite/React-UI + Tauri), Invariante: Jede Mutation als Command über den CommandBus, CLAUDE.md — Arbeitsanweisung für KI-Agenten, Gemeinsames DocNode-Modell für XML und JSON, Invariante: Geparster Baum ist einzige Wahrheit, graphify-/understand-Skill (Wissensgraph-Pflege), Invariante: Logik React-frei und headless testbar, i18n-Layer (apps/editor/src/i18n) (+21 more)

### Community 4 - "JSON-Export-Serialisierung"
Cohesion: 0.13
Nodes (26): arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), nodeToJsonText(), objectText(), serializeJson(), arrayElementToNode() (+18 more)

### Community 5 - "App.tsx: Interaktionstests"
Cohesion: 0.08
Nodes (16): FILES, openSampleFile(), readText, renderApp(), ResizeObserverStub, writeText, ErrorBoundary, Props (+8 more)

### Community 6 - "Tauri-Fensterkonfiguration"
Cohesion: 0.07
Nodes (26): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+18 more)

### Community 7 - "Editor-Paket: Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog, name (+16 more)

### Community 8 - "Editor-Paket: Dev-/Test-Tooling"
Cohesion: 0.09
Nodes (23): devDependencies, jsdom, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/react, @types/react-dom (+15 more)

### Community 9 - "Editor-Paket: TSConfig"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 10 - "AP-Roadmap (AP0, AP2–AP6)"
Cohesion: 0.13
Nodes (20): AP0 — Gerüst & Doku, AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP8 (optional/später) — macOS-Bundle, Namespace-Dialog, Maskottchen, Roadmap Arbeitspakete AP0–AP8 (+12 more)

### Community 11 - "Suchpanel & Suchlogik"
Cohesion: 0.24
Nodes (12): SearchPanelProps, CompiledMatcher, compileMatcher(), findAll(), includesAttribute(), includesName(), includesValue(), replaceAll() (+4 more)

### Community 12 - "Core-Paket: Dependencies"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 13 - "Core-Paket: TSConfig"
Cohesion: 0.12
Nodes (15): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+7 more)

### Community 14 - "Kickoff: Monorepo-Architekturentwurf"
Cohesion: 0.22
Nodes (13): Geplante Monorepo-Struktur (npm-Workspaces, gespiegelt an xdp-designer), command-bus.ts (execute/undo/redo, Revision-Bump, Composite), DocNode {id, kind, name, attributes[], value, children[], byteRange?}, JaxelDocument (Baum, Revision, format-Meta), json-export.ts (DocNode → JSON), json-import.ts (JSON → DocNode), path.ts (indizierte a.b[0].c UND statische a.b.c Pfadberechnung), io.rs (Datei laden mit Encoding-Erkennung / speichern minimal-invasiv) (+5 more)

### Community 15 - "Rust: Tauri-Commands (lib.rs)"
Cohesion: 0.35
Nodes (11): FileContent, PendingOpenPaths, read_text_file(), Result, String, run(), take_pending_open_paths(), write_text_file() (+3 more)

### Community 16 - "Root-Workspace (package.json)"
Cohesion: 0.17
Nodes (11): name, private, scripts, dev, tauri, test, typecheck, version (+3 more)

### Community 17 - "Rust: Encoding-Erkennung (io.rs)"
Cohesion: 0.36
Nodes (10): DecodedFile, detect_encoding(), read_text_file(), Result, String, sniff_xml_declared_encoding(), write_text_file(), Encoding (+2 more)

### Community 18 - "AP7: Feinschliff & Windows-Packaging"
Cohesion: 0.18
Nodes (11): AP7 — Packaging Windows, AP7 — Feinschliff Optik + Bedienung, Stolperfalle: Port 1420 belegt / Zombie-Fenster bei npm run dev, apps/editor (Desktop-App), README.md — Projektübersicht Jaxel, Jaxel (plattformunabhängiger XML/JSON-Editor, Ersatz für Easy XML Editor), Stolperfalle: npm run dev muss im Wurzelverzeichnis laufen, packages/core (UI-freier Modellkern) (+3 more)

### Community 19 - "Pfadberechnung (indiziert/statisch/voll)"
Cohesion: 0.38
Nodes (8): computePaths(), findAncestorChain(), formatFullPath(), formatIndexedPath(), formatStaticPath(), getPathSegments(), PathSegment, segmentsToRender()

### Community 20 - "AP8: Kontextmenü, DnD, Attribut-Editing"
Cohesion: 0.24
Nodes (10): Attribute-Seitenpanel (Namen und Werte direkt änderbar), Baumansicht und Navigation, Verschieben per Drag&Drop (Einfüge-Linie / Als-Kind-Highlight), Kontextmenü (Rechtsklick mit allen Knoten-Aktionen), AP8 — Kontextmenü, voller Pfad, Attribut-Editing, Baum-DnD, Logo, Baum-Drag&Drop (HTML5-DnD über createMoveNodeCommand), CommandBus coalesceKey (Verschmelzen aufeinanderfolgender Commands zu einem Undo-Schritt), formatFullPath (vollständiger Pfad in path.ts) (+2 more)

### Community 21 - "XML-Export-Serialisierung"
Cohesion: 0.40
Nodes (7): escapeAttr(), escapeText(), serializeAttributes(), serializeNode(), serializeNodeMinimal(), serializeXml(), serializeXmlMinimal()

### Community 22 - "Tauri-Capabilities"
Cohesion: 0.22
Nodes (8): description, identifier, permissions, $schema, windows, core:default, dialog:default, main

### Community 23 - "CHANGELOG & VS-Code-Tooling"
Cohesion: 0.22
Nodes (9): Behoben: Absturz beim Wechsel zwischen offenen Dokumenten mit offenem Suchpanel, CHANGELOG.md — Jaxel Änderungsprotokoll, Geändert: Theme grundlegend überarbeitet (hell als neuer Standard, Icon-Toolbar), Unreleased: XML/JSON-Baumeditor, Bearbeiten, Tastaturbedienung, Suchen/Ersetzen, Pfad kopieren, Kontextmenü, Tabs, Startscreen, Logo, Linux-Pakete, CHANGELOG.md (Keep a Changelog Format, von xdp-designer übernommen), Prüfkette VS-Code-Task (Tests + tsc je Paket + cargo check), Bug: Absturz beim Tab-Wechsel mit offener Suche (stale Treffer), .vscode/tasks.json und launch.json (von xdp-designer übernommen, angepasst) (+1 more)

### Community 24 - "Gewaehltes Logo (Variante B) + App-Icons"
Cohesion: 0.32
Nodes (8): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58), Variante B: Markup-Klammern Logo (winning draft)

### Community 25 - "Benutzerhandbuch: Bedienung"
Cohesion: 0.43
Nodes (7): Bearbeiten (Name/Wert ändern, Kind anlegen, Duplizieren, Löschen, Kopieren/Einfügen, Undo/Redo), Dateien öffnen und speichern (Drag&Drop, Startscreen, CLI, minimal-invasiv), docs/benutzerhandbuch.md — Benutzerhandbuch Jaxel, Einstellungen (Theme, Sprache, Such-Filter, Fenster-Modus), Pfad kopieren (vollständig / indiziert / statisch), Suchen, Ersetzen, Filtern (Suchpanel, Scope, Trefferliste), Tastenkürzel-Tabelle

### Community 26 - "Logo-Entwuerfe: Vorschau-Composite"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 27 - "Verworfener Logo-Entwurf A (Knotenbaum)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 28 - "Verworfener Logo-Entwurf C (Monogramm)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 29 - "Easy-XML-Editor-Referenz (Baum/Tabelle)"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

## Knowledge Gaps
- **178 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+173 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App.tsx: UI-Hauptkomponente` to `Dokument-State & Byte-Range-Invalidierung`, `App.tsx: Interaktionstests`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)` connect `Kickoff-Plan: Grundsatzentscheidungen` to `Benutzerhandbuch: Bedienung`, `AP-Roadmap (AP0, AP2–AP6)`, `Kern-Invarianten (Baum, CommandBus, DocNode)`, `Kickoff: Monorepo-Architekturentwurf`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `docs/status.md — Ist-Stand je Arbeitspaket` connect `AP-Roadmap (AP0, AP2–AP6)` to `Kickoff-Plan: Grundsatzentscheidungen`, `Kern-Invarianten (Baum, CommandBus, DocNode)`, `AP7: Feinschliff & Windows-Packaging`, `AP8: Kontextmenü, DnD, Attribut-Editing`, `CHANGELOG & VS-Code-Tooling`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _178 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dokument-State & Byte-Range-Invalidierung` be split into smaller, more focused modules?**
  _Cohesion score 0.11581173982020095 - nodes in this community are weakly interconnected._
- **Should `App.tsx: UI-Hauptkomponente` be split into smaller, more focused modules?**
  _Cohesion score 0.06203007518796992 - nodes in this community are weakly interconnected._
- **Should `Kickoff-Plan: Grundsatzentscheidungen` be split into smaller, more focused modules?**
  _Cohesion score 0.07681365576102418 - nodes in this community are weakly interconnected._