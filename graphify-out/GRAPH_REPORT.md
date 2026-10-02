# Graph Report - xml-editor  (2026-09-25)

## Corpus Check
- 1 files · ~165,336 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1291 nodes · 2719 edges · 117 communities (65 shown, 52 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App
- createNode
- TreeView.tsx
- index.ts
- App.tsx
- io.rs
- docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)
- parseXml
- lib.rs
- local-prefs.ts
- App.test.tsx
- Workspace
- SearchPanel.tsx
- react
- tree-actions.ts
- JaxelHost
- tauri.conf.json
- compilerOptions
- replace-all.ts
- xml-export.ts
- workspace.ts
- logging.ts
- host.ts
- workspace.test.ts
- selection.ts
- tree-actions.test.ts
- editor/package.json
- actions.ts
- compilerOptions
- search.ts
- devDependencies
- xml-import.ts
- base64.ts
- parseElement
- theme-colors.test.tsx
- Jaxel-Logo SVG (Variante B: Markup-Klammern)
- default.json
- shortcuts.test.ts
- package.json
- XML catalog containing person records
- core/package.json
- Jaxel Project Identity
- scripts
- index.tsx
- Jaxel implementation status and work log
- dependencies
- App.vscode.test.tsx
- Screenshot: Baum-Kobalt theme in XML editor
- DocFormat
- Jaxel layered architecture
- devDependencies
- MenuBar.tsx
- release.mjs
- Screenshot of the Baum Nordlicht theme
- ContextMenu.tsx
- XML snippet showing a catalog and person elements
- Baumansicht im dunklen Jaxel-Theme
- Baum-Ansicht im hellen Theme
- tauri-close-capabilities.test.ts
- scroll-math.ts
- Logo-Entwuerfe Vorschau (Composite: A/B/C)
- Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat)
- Variante C: J-Monogramm (Logo-Entwurf, verworfen)
- Syntax-highlighted XML editor displaying a catalog fragment
- Baum-Kontrast UI screenshot
- CloseConfirmDialog.tsx
- IconButton.tsx
- ReloadDialog.tsx
- ResizeHandle.tsx
- Toast.tsx
- XML document with a catalog and person elements
- Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table)
- Value XOR children rule: a node cannot contain both a direct value and child nodes
- Jaxel GitHub release workflow
- apps/editor/index.html (HTML-Einstiegspunkt)
- main.tsx
- Forest-inspired dark editor theme using deep green surfaces, brighter green comments, pale text, and orange syntax accents.
- Person element with name Clara and id P-3
- Screenshot: Easy XML Editor Kontextmenue auf XML-Baumknoten
- An empty XML leaf has no direct value and no children; double-clicking its blank row area starts value editing
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
- XML editor showing a catalog snippet with a comment and a person named Clara
- Clicking a collapsed tree row opens it; clicking an open row only selects it, while its arrow collapses it
- Selected siblings under one parent duplicate as one ordered contiguous block after the last selected sibling
- Toolbar plus adds a sibling after the selection and double-plus adds a child under the selected node
- Decision: row clicks expand collapsed nodes but do not collapse open nodes; collapse remains available through arrow, left key, and collapse-all
- Decision: duplicate same-parent selected siblings together in tree order as one undo step; cross-parent batches are unsupported
- Decision: toolbar plus and double-plus add sibling and child respectively, following the valid-selection rules
- Decision: add a direct-value field and copy exactly the node value from the right panel
- Plan: Reload-Dialog Fokus- und Dateistandbehandlung
- Option
- Path
- jaxel
- Jaxel project guide
- Vec

## God Nodes (most connected - your core abstractions)
1. `App()` - 76 edges
2. `DocNode` - 67 edges
3. `parseXml()` - 51 edges
4. `createNode()` - 41 edges
5. `CommandBus` - 40 edges
6. `Workspace` - 35 edges
7. `JaxelHost` - 27 edges
8. `serializeXml()` - 23 edges
9. `parseJson()` - 22 edges
10. `setError()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `nodes()` --calls--> `createNode()`  [EXTRACTED]
  apps/editor/src/tree/selection.test.ts → packages/core/src/model/node.ts
- `sampleTree()` --calls--> `createNode()`  [EXTRACTED]
  apps/editor/src/tree/flatten.test.ts → packages/core/src/model/node.ts
- `Jaxel-Logo SVG (Variante B: Markup-Klammern)` --references--> `App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo`  [INFERRED]
  apps/editor/src/assets/jaxel-logo.svg → assets/logo-drafts/variante-b-markup.svg
- `OpenDocumentState` --references--> `CommandBus`  [EXTRACTED]
  apps/editor/src/state/workspace.ts → packages/core/src/commands/command-bus.ts
- `TreeRow` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/tree/flatten.ts → packages/core/src/model/node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]
- **Screenshot depicts syntax-highlighted XML catalog content** — apps_editor_vitest_attachments_f010c79602649fc70b90a02a39a2c9dc92ba9123_image_xml_editor_screenshot, apps_editor_vitest_attachments_f010c79602649fc70b90a02a39a2c9dc92ba9123_concept_xml_syntax_highlighting, apps_editor_vitest_attachments_f4da51f2923b93c94a48094ec576b1ece0dd0418_xml_catalog [EXTRACTED 1.00]
- **Dunkles Editor-UI mit kompakter XML-Baumansicht und Syntaxfarben** — apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_dark_editor_theme, apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_xml_tree_and_syntax_coloring, apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_compact_tree_layout [INFERRED 0.85]

## Communities (117 total, 52 thin omitted)

### Community 0 - "App"
Cohesion: 0.06
Nodes (69): App(), actionBlocker(), actionProps(), applyArrowIntent(), applyResolvedViews(), buildContextMenuItems(), buildMenuBarMenus(), captureViewSegments() (+61 more)

### Community 1 - "createNode"
Cohesion: 0.06
Nodes (63): convertDocument(), InvalidXmlNameError, isAttributeCandidate(), isLeaf(), isValidXmlName(), joinPath(), jsonToXml(), xmlToJson() (+55 more)

### Community 2 - "TreeView.tsx"
Cohesion: 0.06
Nodes (37): computeDropAllowed(), positionFromRatio(), buildFilterKeepSet(), flattenFiltered(), DisplayRow, flattenTree(), sampleTree(), TreeRow (+29 more)

### Community 3 - "index.ts"
Cohesion: 0.11
Nodes (31): FocusBreadcrumbProps, ByteRangeSnapshot, Command, createCompositeCommand(), createInsertNodeCommand(), createMoveNodeCommand(), DropPosition, MovePlan (+23 more)

### Community 4 - "App.tsx"
Cohesion: 0.06
Nodes (38): SelectionActionKind, ToastEntry, ArrowIntent, nextSelectedRow(), planArrowLeft(), planArrowRight(), packages_core_src_index_commandbus, packages_core_src_index_computechanges (+30 more)

### Community 5 - "io.rs"
Cohesion: 0.09
Nodes (24): DecodedFile, detect_encoding(), encode(), FileStat, keeps_utf16be_with_its_bom(), keeps_utf16le_with_its_bom(), read_text_file(), reads_a_declared_utf16_file_with_ascii_bytes_as_utf8() (+16 more)

### Community 6 - "docs/archiv/00-kickoff-plan.md — Ursprünglicher Kickoff-Plan (Grilling-Ergebnis)"
Cohesion: 0.06
Nodes (40): AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows, AP8 (optional/später) — macOS-Bundle, Namespace-Dialog, Maskottchen (+32 more)

### Community 7 - "parseXml"
Cohesion: 0.13
Nodes (20): captureByteRanges(), clearByteRanges(), copyByteRanges(), restoreByteRanges(), sameShape(), stripByteRanges(), syncByteRangesAfterSave(), CommandBus (+12 more)

### Community 8 - "lib.rs"
Cohesion: 0.14
Nodes (34): AppHandle, bring_main_window_to_front(), FileContent, FileStatResult, log_frontend(), log_io_error(), open_decoded_file(), open_log() (+26 more)

### Community 9 - "local-prefs.ts"
Cohesion: 0.09
Nodes (30): RightSidebar(), RightSidebarProps, SidebarTab, SettingsDialogProps, THEMES, addRecentFile(), getLastDir(), getRecentFiles() (+22 more)

### Community 10 - "App.test.tsx"
Cohesion: 0.07
Nodes (17): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, findTreeText(), openBlobFile(), openCommentedFile() (+9 more)

### Community 11 - "Workspace"
Cohesion: 0.16
Nodes (6): nextUntitledNumber(), serializeForSave(), tabKey(), Workspace, remapTab(), resolveDeepest()

### Community 12 - "SearchPanel.tsx"
Cohesion: 0.10
Nodes (26): conversionErrorMessage(), hostErrorMessage(), toErrorMessage(), CopyPathKind, SearchPanel(), goToOffset(), handleEnter(), handleHeightDrag() (+18 more)

### Community 13 - "react"
Cohesion: 0.09
Nodes (19): AttributesPanel(), handleCreate(), nameKey(), AttributesPanelProps, AttrNameInput(), TabState, fileName(), isEditableTarget() (+11 more)

### Community 14 - "tree-actions.ts"
Cohesion: 0.18
Nodes (23): BulkRow, createBulkDuplicateCommand(), createBulkInsertCommand(), createBulkMoveCommand(), createBulkRemoveCommand(), duplicateRowsShareParent(), removableSlotsDescending(), topmostRows() (+15 more)

### Community 16 - "tauri.conf.json"
Cohesion: 0.08
Nodes (23): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+15 more)

### Community 17 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 18 - "replace-all.ts"
Cohesion: 0.20
Nodes (11): isValidCommentText(), createReplaceAllCommand(), createSetAttributeCommand(), jsonTypeAfterEdit(), createDocument(), SearchOptions, XML, OPTIONS (+3 more)

### Community 19 - "xml-export.ts"
Cohesion: 0.18
Nodes (13): parseDocument(), serializeDocument(), parseFragments(), serializeFragments(), encodeAttribute(), encodeText(), ByteSource, serializeAttributes() (+5 more)

### Community 20 - "workspace.ts"
Cohesion: 0.11
Nodes (17): useJaxelDocuments(), conversionEncoding(), detectFormat(), formatOfExtension(), NEW_DOCUMENT_SKELETON, OpenDocumentState, ResolvedView, RFC-8259 (+9 more)

### Community 21 - "logging.ts"
Cohesion: 0.16
Nodes (13): ErrorBoundary, Props, State, getJaxelHost(), describeError(), installGlobalErrorLogging(), handleError(), handleRejection() (+5 more)

### Community 22 - "host.ts"
Cohesion: 0.12
Nodes (10): createVscodeHost(), request(), HostFileDropEvent, HostMode, Message, randomRequestId(), VsCodeApi, VscodeWindow (+2 more)

### Community 23 - "workspace.test.ts"
Cohesion: 0.16
Nodes (12): HostFileContent, HostFileStat, active(), InMemoryHost, nameNode(), openCatalog(), segmentsOf(), setName() (+4 more)

### Community 24 - "selection.ts"
Cohesion: 0.20
Nodes (13): EMPTY_SELECTION, extendSelection(), pruneSelection(), selectedRowsInOrder(), Selection, selectionForActionOn(), SelectModifier, selectModifierOf() (+5 more)

### Community 25 - "tree-actions.test.ts"
Cohesion: 0.14
Nodes (14): planTreeAction(), TreeAction, TreeActionContext, setValue(), COMMENTED, INSIDE, NOTIZ, PERSON (+6 more)

### Community 26 - "editor/package.json"
Cohesion: 0.12
Nodes (16): name, private, type, version, @jaxel/core, playwright, react-dom, @tauri-apps/cli (+8 more)

### Community 27 - "actions.ts"
Cohesion: 0.15
Nodes (11): ActionContext, ACTIONS, ActionSpec, AppActionId, isActionEnabled(), KeyNames, IDS, KEYS (+3 more)

### Community 28 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+8 more)

### Community 29 - "search.ts"
Cohesion: 0.28
Nodes (11): CompiledMatcher, compileMatcher(), findAll(), includesAttribute(), includesName(), includesValue(), isInventedName(), planReplacements() (+3 more)

### Community 30 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, playwright, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node, @types/react (+7 more)

### Community 31 - "xml-import.ts"
Cohesion: 0.21
Nodes (12): CommentOutBlocker, containsComment(), containsDoubleHyphen(), createCommentOutCommand(), createUncommentCommand(), buildByteOffsetTable(), parseCommentedOutSubtree(), ParseXmlResult (+4 more)

### Community 32 - "base64.ts"
Cohesion: 0.24
Nodes (10): B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedBase64, DecodedContentKind, detectTextFormat(), EXTENSIONS, looksLikeBase64() (+2 more)

### Community 33 - "parseElement"
Cohesion: 0.26
Nodes (12): BARE_AMPERSAND, decodeCharData(), PREDEFINED, STARTS_REFERENCE, fail(), parseAttributes(), parseElement(), parseName() (+4 more)

### Community 34 - "theme-colors.test.tsx"
Cohesion: 0.18
Nodes (7): Theme, contrastRatio(), luminance(), THEMES, ROWS, SampleRow, THEMES

### Community 35 - "Jaxel-Logo SVG (Variante B: Markup-Klammern)"
Cohesion: 0.22
Nodes (9): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, AboutDialogProps, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58) (+1 more)

### Community 36 - "default.json"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 37 - "shortcuts.test.ts"
Cohesion: 0.27
Nodes (7): resolveShortcut(), ShortcutAction, ShortcutContext, ShortcutKeyInfo, branchSelected, leafSelected, noSelection

### Community 38 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, dev, tauri, test, typecheck, version (+1 more)

### Community 39 - "XML catalog containing person records"
Cohesion: 0.22
Nodes (9): Person record for Clara with ID P-3, XML comment says the status from July 2026 still needs review, Dark themed XML editor showing a catalog with person records and a review comment, XML syntax highlighting for tags, attributes, comments, and text, Screenshot of syntax-highlighted XML showing a catalog and person elements, Person record with an ID and name fields, XML comment marking a July 2026 status for review, XML catalog containing person records (+1 more)

### Community 40 - "core/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, test, typecheck, type, version

### Community 41 - "Jaxel Project Identity"
Cohesion: 0.29
Nodes (8): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Zentrale Invarianten (7 Core Invariants)

### Community 42 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, preview, tauri, test, test:visual, typecheck

### Community 43 - "index.tsx"
Cohesion: 0.29
Nodes (6): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale

### Community 44 - "Jaxel implementation status and work log"
Cohesion: 0.36
Nodes (8): Jaxel implementation status and work log, Verification passed: 345 Core tests and 350 Editor tests, Incremental Graphify update produced 1,289 nodes and 2,719 edges with no dangling endpoints or self-loops after removing a false AST self-edge, Selected siblings duplicate as an ordered block after the selection; selections across parents are unsupported, Right-panel value edits use the CommandBus and typing remains one undo step, Verification passed: npm run typecheck and root npm run dev started Vite and Tauri, Right-panel value editing and copy, ordered sibling duplication, toolbar add actions, asymmetric expansion, and empty-leaf editing are implemented, Value XOR children is enforced: ordinary containers have no value field and core actions block value edits on nodes with children

### Community 45 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog

### Community 46 - "App.vscode.test.tsx"
Cohesion: 0.33
Nodes (5): createFakeVscodeHost(), renderEmbedded(), ref_app_js, @testing-library/react, @testing-library/user-event

### Community 47 - "Screenshot: Baum-Kobalt theme in XML editor"
Cohesion: 0.29
Nodes (7): Screenshot: Baum-Kobalt theme in XML editor, Dark navy editor theme with cobalt accents, XML tree content for person records, XML syntax highlighting, Terracotta theme XML tree screenshot, Terracotta color theme, XML tree editor interface

### Community 48 - "DocFormat"
Cohesion: 0.38
Nodes (3): ConvertDialogProps, NewDocumentDialogProps, DocFormat

### Community 49 - "Jaxel layered architecture"
Cohesion: 0.29
Nodes (7): CommandBus and undo, Shared DocNode model for XML and JSON, German and English UI text via i18n, Jaxel layered architecture, Minimal-invasive save, XSD and DTD validation excluded, TypeScript XML and JSON parser

### Community 50 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, typescript, vitest, @types/node, typescript, vitest

### Community 51 - "MenuBar.tsx"
Cohesion: 0.33
Nodes (4): MenuBarEntry, MenuBarMenu, MenuBarProps, MenuHeading

### Community 52 - "release.mjs"
Cohesion: 0.33
Nodes (3): branch, existingTags, rl

### Community 53 - "Screenshot of the Baum Nordlicht theme"
Cohesion: 0.40
Nodes (5): Dark blue-gray editor theme with teal, green, and pale blue syntax colors, Hierarchical XML tree with nested person entries, Screenshot of the Baum Nordlicht theme, XML syntax highlighting distinguishes tags, attributes, values, and comments, XML tree editor showing a catalog and nested person elements

### Community 54 - "ContextMenu.tsx"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 55 - "XML snippet showing a catalog and person elements"
Cohesion: 0.40
Nodes (5): Catalog with a visible count of 4, Person elements with IDs P-1 and P-3, Person name Clara, Comment says “Stand: Juli 2026, noch zu prüfen”, XML snippet showing a catalog and person elements

### Community 56 - "Baumansicht im dunklen Jaxel-Theme"
Cohesion: 0.50
Nodes (4): Kompakte, eingerückte Baumstruktur mit Elementnamen und Kindanzahlen, Dunkles Editor-Theme mit anthrazitfarbenem Hintergrund und gedämpften Kontrastfarben, Baumansicht im dunklen Jaxel-Theme, XML-Baumansicht mit farblich hervorgehobenen Elementen, Attributen und Kommentaren

### Community 57 - "Baum-Ansicht im hellen Theme"
Cohesion: 0.50
Nodes (4): Baum-Ansicht im hellen Theme, Helles UI-Theme mit weißem Hintergrund und hellgrauer Kopfzeile, XML-Syntaxfarben: grüne Kommentare, blaue Tags und Attribute, dunkler Text, XML-Baumansicht mit Einrückung und aufklappbaren Knoten

### Community 60 - "Logo-Entwuerfe Vorschau (Composite: A/B/C)"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 61 - "Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat)"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 62 - "Variante C: J-Monogramm (Logo-Entwurf, verworfen)"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 63 - "Syntax-highlighted XML editor displaying a catalog fragment"
Cohesion: 0.67
Nodes (3): XML catalog with person records and ID/name fields, Screenshot of XML source editor, Syntax-highlighted XML editor displaying a catalog fragment

### Community 64 - "Baum-Kontrast UI screenshot"
Cohesion: 0.67
Nodes (3): Dark themed hierarchical editor tree, Baum-Kontrast UI screenshot, Syntax color contrast

### Community 71 - "XML document with a catalog and person elements"
Cohesion: 0.67
Nodes (3): XML comment: Stand Juli 2026, noch zu prüfen, XML document with a catalog and person elements, XML editor screenshot

### Community 72 - "Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table)"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

### Community 73 - "Value XOR children rule: a node cannot contain both a direct value and child nodes"
Cohesion: 0.67
Nodes (3): The right panel shows a direct value editor and copy action for leaf nodes; copy transfers only the value and is disabled when empty, Nodes with children have no value field because direct value and child nodes cannot coexist, Value XOR children rule: a node cannot contain both a direct value and child nodes

## Knowledge Gaps
- **313 isolated node(s):** `ByteSource`, `ChangeMarker`, `DropTarget`, `EditingField`, `TreeRowViewProps` (+308 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 545 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `TreeView.tsx`, `App.tsx`, `local-prefs.ts`, `App.test.tsx`, `SearchPanel.tsx`, `App.vscode.test.tsx`, `workspace.ts`, `editor/package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `parseXml()` connect `parseXml` to `createNode`, `parseElement`, `index.ts`, `Workspace`, `replace-all.ts`, `xml-export.ts`, `workspace.ts`, `tree-actions.test.ts`, `xml-import.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `displayNameOf()` and `handleFocus()`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ByteSource`, `ChangeMarker`, `DropTarget` to the rest of the system?**
  _313 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.05878332194121668 - nodes in this community are weakly interconnected._
- **Should `createNode` be split into smaller, more focused modules?**
  _Cohesion score 0.06164383561643835 - nodes in this community are weakly interconnected._