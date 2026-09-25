# Graph Report - xml-editor  (2026-09-25)

## Corpus Check
- 86 files · ~163,895 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1275 nodes · 2814 edges · 118 communities (72 shown, 46 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Search Panel and State
- Focus Breadcrumb Navigation
- Byte Range Save Lifecycle
- App Actions and UI
- Rust I/O and Encoding
- Project History and Work Packages
- Tauri Window Lifecycle
- UI Tests and Dialogs
- Right Sidebar Panels
- Main Application Interface
- Tree Drag and Drop
- Document Parsing and Formats
- Core Model and Undo
- JSON Import and Arrays
- View Persistence and Menus
- Host Integration and Events
- Tauri Configuration
- XML Comment Mutations
- Reload Conflict Workflow
- TypeScript Editor Config
- JSON Serialization and Escaping
- Workspace Document State
- Error Boundaries
- Tauri IPC Host Adapter
- Selection Navigation
- Editor Package Manifest
- File I/O and Workspace
- Tree Action Planning
- Document Paths
- XML Character Encoding
- Core Package Configuration
- App Action Registry
- New Document Commands
- Editor Tooling Configuration
- Document Conversion
- Attribute Editing
- Search Result Filtering
- Change Tracking and Diff
- Base64 File Decoding
- Theme Color Tests
- Brand and Logo Concepts
- Locale and App Metadata
- Window Closing and View State
- Shortcut Resolution
- Root Package Configuration
- XML Test Fixtures
- Core Package Metadata
- Agent Instructions and Invariants
- Build and Release Scripts
- Application Entry Points
- UI Dependencies
- Keyboard Navigation
- VS Code Integration Tests
- Cobalt Theme Image
- Keyboard Navigation Rules
- Tree Row Behavior
- Conversion Dialog
- TypeScript Toolchain
- Menu Bar Actions
- Release Automation
- Nordlicht Theme Image
- Context Menu Actions
- XML Catalog Fixture
- Dark Theme Image
- Light Theme Image
- Tauri Close Permissions
- Scroll Calculations
- Logo Preview and Variants
- Tree Model Icon Motif
- Jaxel App Logo
- XML Editor Screenshot
- Attribute Panel
- High Contrast Theme
- Close Confirmation Dialog
- Icon Button Component
- Reload Dialog
- Resize Handle
- Toast Notifications
- XML Comment Fixture
- Easy XML Editor Reference UI
- Release Workflow and Changelog
- HTML and React Entry
- React Mount Point
- Forest Theme Image
- Person Record Fixture
- Easy XML Context Menu
- Domain Glossary
- Search Design Documents
- Placeholder Application Icon
- 256 Pixel Application Icon
- 128 Pixel Application Icon
- 32 Pixel Application Icon
- 64 Pixel Application Icon
- 512 Pixel Application Icon
- Windows Tile 107
- Windows Tile 142
- Windows Tile 150
- Windows Tile 284
- Windows Tile 30
- Windows Tile 310
- Windows Tile 44
- Windows Tile 71
- Windows Tile 89
- Windows Store Icon
- XML Editor Screenshot
- Jaxel Decision Log
- Jaxel Implementation Status
- Reload Dialog Focus Design
- Rust Option Type
- Rust Path Type
- Jaxel Rust Crate
- Rust Vector Type

## God Nodes (most connected - your core abstractions)
1. `App()` - 102 edges
2. `DocNode` - 71 edges
3. `parseXml()` - 53 edges
4. `createNode()` - 43 edges
5. `CommandBus` - 42 edges
6. `Workspace` - 35 edges
7. `JaxelHost` - 27 edges
8. `serializeXml()` - 23 edges
9. `parseJson()` - 22 edges
10. `toErrorMessage()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `nodes()` --calls--> `createNode()`  [EXTRACTED]
  apps/editor/src/tree/selection.test.ts → packages/core/src/model/node.ts
- `sampleTree()` --calls--> `createNode()`  [EXTRACTED]
  apps/editor/src/tree/flatten.test.ts → packages/core/src/model/node.ts
- `Jaxel-Logo SVG (Variante B: Markup-Klammern)` --references--> `App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo`  [INFERRED]
  apps/editor/src/assets/jaxel-logo.svg → assets/logo-drafts/variante-b-markup.svg
- `AttributesPanelProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/panels/AttributesPanel.tsx → packages/core/src/model/node.ts
- `FocusBreadcrumbProps` --references--> `DocNode`  [EXTRACTED]
  apps/editor/src/tree/FocusBreadcrumb.tsx → packages/core/src/model/node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AP8: generierter App-Icon-Satz (aus dem gewaehlten Logo-Entwurf)** — apps_editor_src_tauri_icons_128x128_appicon, apps_editor_src_tauri_icons_128x128_2x_appicon, apps_editor_src_tauri_icons_32x32_appicon, apps_editor_src_tauri_icons_64x64_appicon, apps_editor_src_tauri_icons_icon_appicon, apps_editor_src_tauri_icons_storelogo_appicon, apps_editor_src_tauri_icons_square107x107logo_appicon, apps_editor_src_tauri_icons_square142x142logo_appicon, apps_editor_src_tauri_icons_square150x150logo_appicon, apps_editor_src_tauri_icons_square284x284logo_appicon, apps_editor_src_tauri_icons_square30x30logo_appicon, apps_editor_src_tauri_icons_square310x310logo_appicon, apps_editor_src_tauri_icons_square44x44logo_appicon, apps_editor_src_tauri_icons_square71x71logo_appicon, apps_editor_src_tauri_icons_square89x89logo_appicon [EXTRACTED 1.00]
- **Screenshot depicts syntax-highlighted XML catalog content** — apps_editor_vitest_attachments_f010c79602649fc70b90a02a39a2c9dc92ba9123_image_xml_editor_screenshot, apps_editor_vitest_attachments_f010c79602649fc70b90a02a39a2c9dc92ba9123_concept_xml_syntax_highlighting, apps_editor_vitest_attachments_f4da51f2923b93c94a48094ec576b1ece0dd0418_xml_catalog [EXTRACTED 1.00]
- **Dunkles Editor-UI mit kompakter XML-Baumansicht und Syntaxfarben** — apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_dark_editor_theme, apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_xml_tree_and_syntax_coloring, apps_editor_src_screenshots_theme_screenshots_visual_test_tsx_baum_dark_chromium_linux_compact_tree_layout [INFERRED 0.85]

## Communities (118 total, 46 thin omitted)

### Community 0 - "Search Panel and State"
Cohesion: 0.06
Nodes (44): CopyPathKind, SearchPanel(), goToOffset(), handleEnter(), handleHeightDrag(), handleReplaceAll(), matchLabel(), moveCursor() (+36 more)

### Community 1 - "Focus Breadcrumb Navigation"
Cohesion: 0.11
Nodes (32): FocusBreadcrumbProps, BulkRow, createBulkDuplicateCommand(), createBulkInsertCommand(), createBulkMoveCommand(), createBulkRemoveCommand(), removableSlotsDescending(), topmostRows() (+24 more)

### Community 2 - "Byte Range Save Lifecycle"
Cohesion: 0.11
Nodes (28): captureByteRanges(), clearByteRanges(), copyByteRanges(), restoreByteRanges(), sameShape(), stripByteRanges(), syncByteRangesAfterSave(), CommandBus (+20 more)

### Community 3 - "App Actions and UI"
Cohesion: 0.09
Nodes (37): isActionEnabled(), App(), actionBlocker(), actionProps(), buildContextMenuItems(), closeTabSet(), collapseAllTree(), commentMenuEntries() (+29 more)

### Community 4 - "Rust I/O and Encoding"
Cohesion: 0.09
Nodes (24): DecodedFile, detect_encoding(), encode(), FileStat, keeps_utf16be_with_its_bom(), keeps_utf16le_with_its_bom(), read_text_file(), reads_a_declared_utf16_file_with_ascii_bytes_as_utf8() (+16 more)

### Community 5 - "Project History and Work Packages"
Cohesion: 0.06
Nodes (40): AP1 — Modellkern (core), AP2 — Baumansicht, AP3 — Editieren, AP4 — Suchen/Ersetzen + Pfad-Kopieren + Tabellenansicht, AP5 — Tabs & Multi-Window & Settings, AP6 — Packaging Linux, AP7 — Packaging Windows, AP8 (optional/später) — macOS-Bundle, Namespace-Dialog, Maskottchen (+32 more)

### Community 6 - "Tauri Window Lifecycle"
Cohesion: 0.14
Nodes (34): AppHandle, bring_main_window_to_front(), FileContent, FileStatResult, log_frontend(), log_io_error(), open_decoded_file(), open_log() (+26 more)

### Community 7 - "UI Tests and Dialogs"
Cohesion: 0.07
Nodes (14): B64_ATTR, B64_PDF, B64_XML, eventMock, FILES, openBlobFile(), openCommentedFile(), openJsonFile() (+6 more)

### Community 8 - "Right Sidebar Panels"
Cohesion: 0.12
Nodes (24): RightSidebar(), RightSidebarProps, SidebarTab, SettingsDialogProps, THEMES, addRecentFile(), getRecentFiles(), getSearchDockSide() (+16 more)

### Community 9 - "Main Application Interface"
Cohesion: 0.08
Nodes (25): SelectionActionKind, ToastEntry, packages_core_src_index_computechanges, packages_core_src_index_computepaths, packages_core_src_index_decodebase64, packages_core_src_index_getpathsegments, packages_core_src_index_parsefragments, packages_core_src_index_serializefragments (+17 more)

### Community 10 - "Tree Drag and Drop"
Cohesion: 0.12
Nodes (17): computeDropAllowed(), positionFromRatio(), TreeRow, ChangeMarker, DropTarget, EditingField, setDragGhost(), TreeRowViewProps (+9 more)

### Community 11 - "Document Parsing and Formats"
Cohesion: 0.18
Nodes (16): ParsedDocument, parseDocument(), serializeDocument(), parseFragments(), serializeFragments(), ByteSource, serializeXml(), wrap() (+8 more)

### Community 12 - "Core Model and Undo"
Cohesion: 0.08
Nodes (25): CommandBus and undo, Shared DocNode model for XML and JSON, German and English UI text via i18n, Jaxel layered architecture, Minimal-invasive save, XSD and DTD validation excluded, TypeScript XML and JSON parser, Base64 content preview (+17 more)

### Community 13 - "JSON Import and Arrays"
Cohesion: 0.16
Nodes (24): arrayElementToNode(), JArray, JBoolean, JNull, JNumber, JObject, JsonSyntaxError, jsonTypeOf() (+16 more)

### Community 14 - "View Persistence and Menus"
Cohesion: 0.19
Nodes (22): applyResolvedViews(), buildMenuBarMenus(), captureViewSegments(), copyPath(), fileNameOf(), handleConvertConfirm(), handleCopyNode(), handleCopyTabPath() (+14 more)

### Community 16 - "Tauri Configuration"
Cohesion: 0.08
Nodes (23): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+15 more)

### Community 17 - "XML Comment Mutations"
Cohesion: 0.20
Nodes (20): CommentOutBlocker, containsComment(), containsDoubleHyphen(), createCommentOutCommand(), createUncommentCommand(), isValidCommentText(), createReplaceAllCommand(), createSetAttributeCommand() (+12 more)

### Community 18 - "Reload Conflict Workflow"
Cohesion: 0.20
Nodes (6): handleKeepMine(), useJaxelDocuments(), serializeForSave(), Workspace, remapTab(), resolveDeepest()

### Community 19 - "TypeScript Editor Config"
Cohesion: 0.09
Nodes (22): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 20 - "JSON Serialization and Escaping"
Cohesion: 0.18
Nodes (16): arrayText(), escapeJsonString(), formatPrimitive(), groupByName(), JsonExportDoc, nodeToJsonText(), objectText(), serializeJson() (+8 more)

### Community 21 - "Workspace Document State"
Cohesion: 0.12
Nodes (18): conversionEncoding(), detectFormat(), formatOfExtension(), NEW_DOCUMENT_SKELETON, OpenDocumentState, ResolvedView, WorkspaceHost, RFC-8259 (+10 more)

### Community 22 - "Error Boundaries"
Cohesion: 0.16
Nodes (13): ErrorBoundary, Props, State, getJaxelHost(), describeError(), installGlobalErrorLogging(), handleError(), handleRejection() (+5 more)

### Community 23 - "Tauri IPC Host Adapter"
Cohesion: 0.12
Nodes (10): createVscodeHost(), request(), HostFileDropEvent, HostMode, Message, randomRequestId(), VsCodeApi, VscodeWindow (+2 more)

### Community 24 - "Selection Navigation"
Cohesion: 0.20
Nodes (13): EMPTY_SELECTION, extendSelection(), pruneSelection(), selectedRowsInOrder(), Selection, selectionForActionOn(), SelectModifier, selectModifierOf() (+5 more)

### Community 25 - "Editor Package Manifest"
Cohesion: 0.12
Nodes (16): name, private, type, version, @jaxel/core, playwright, react-dom, @tauri-apps/cli (+8 more)

### Community 26 - "File I/O and Workspace"
Cohesion: 0.17
Nodes (11): HostFileContent, HostFileStat, active(), InMemoryHost, nameNode(), openCatalog(), segmentsOf(), setName() (+3 more)

### Community 27 - "Tree Action Planning"
Cohesion: 0.15
Nodes (14): planTreeAction(), TreeAction, TreeActionContext, setValue(), COMMENTED, INSIDE, NOTIZ, PERSON (+6 more)

### Community 28 - "Document Paths"
Cohesion: 0.24
Nodes (14): computePaths(), findAncestorChain(), findNodeById(), formatFullPath(), formatIndexedPath(), formatStaticPath(), getPathSegments(), PathSegment (+6 more)

### Community 29 - "XML Character Encoding"
Cohesion: 0.18
Nodes (16): BARE_AMPERSAND, decodeCharData(), encodeAttribute(), encodeText(), PREDEFINED, STARTS_REFERENCE, serializeAttributes(), serializeNode() (+8 more)

### Community 30 - "Core Package Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride, noUncheckedIndexedAccess, skipLibCheck (+8 more)

### Community 31 - "App Action Registry"
Cohesion: 0.16
Nodes (10): ActionContext, ACTIONS, ActionSpec, AppActionId, KeyNames, IDS, KEYS, apps_editor_src_i18n_de (+2 more)

### Community 32 - "New Document Commands"
Cohesion: 0.20
Nodes (4): handleBreadcrumbNavigate(), handleNew(), nextUntitledNumber(), tabKey()

### Community 33 - "Editor Tooling Configuration"
Cohesion: 0.13
Nodes (15): devDependencies, playwright, @tauri-apps/cli, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node, @types/react (+7 more)

### Community 34 - "Document Conversion"
Cohesion: 0.25
Nodes (12): convertDocument(), ConvertParams, InvalidXmlNameError, isAttributeCandidate(), isLeaf(), isValidXmlName(), joinPath(), jsonToXml() (+4 more)

### Community 35 - "Attribute Editing"
Cohesion: 0.18
Nodes (9): AttributesPanelProps, AttrNameInput(), Base64PreviewDialogProps, fileName(), WelcomeScreen(), WelcomeScreenProps, packages_core_src_index_lookslikebase64, ref_i18n_index_js (+1 more)

### Community 36 - "Search Result Filtering"
Cohesion: 0.25
Nodes (7): buildFilterKeepSet(), flattenFiltered(), DisplayRow, flattenTree(), sampleTree(), withTombstones(), walkTree()

### Community 37 - "Change Tracking and Diff"
Cohesion: 0.22
Nodes (11): attributesSignature(), captureChangeBaseline(), ChangeBaseline, ChangeBaselineNode, ChangeSet, computeChanges(), EMPTY_CHANGES, Tombstone (+3 more)

### Community 38 - "Base64 File Decoding"
Cohesion: 0.24
Nodes (10): B64_LOOKUP, decodeBase64(), decodeBytes(), DecodedBase64, DecodedContentKind, detectTextFormat(), EXTENSIONS, looksLikeBase64() (+2 more)

### Community 39 - "Theme Color Tests"
Cohesion: 0.18
Nodes (7): Theme, contrastRatio(), luminance(), THEMES, ROWS, SampleRow, THEMES

### Community 40 - "Brand and Logo Concepts"
Cohesion: 0.22
Nodes (9): Jaxel-Logo SVG (Variante B: Markup-Klammern), Logokonzept 'Markup-Klammern' (weisse Spitzklammern + Knotenpunkt auf Petrol, Variante B), Konzept: visuelle Markenidentitaet als XML/JSON-Editor (Winkelklammern-Symbolik), App icon file set (src-tauri/icons: icon.png, icon.ico, icon.icns, Square*Logo.png, etc.), generated from the Variante B logo, AboutDialogProps, Angle-bracket / markup polyline motif (two white chevrons, stroke-width 19, rounded caps/joins), Orange accent dot (circle, cx=128 cy=128 r=15, fill #ed6c13) centered between the brackets, Petrol/teal diagonal gradient background (#00908f to #00615f) on a 256x256 rounded-square (rx=58) (+1 more)

### Community 41 - "Locale and App Metadata"
Cohesion: 0.18
Nodes (10): description, identifier, permissions, $schema, windows, core:default, core:window:allow-close, core:window:allow-destroy (+2 more)

### Community 42 - "Window Closing and View State"
Cohesion: 0.22
Nodes (10): closeTabsAndForgetView(), destroyWindow(), displayNameOf(), handleClosePromptDiscard(), handleClosePromptSave(), handleSave(), handleSaveAs(), promptSaveAs() (+2 more)

### Community 43 - "Shortcut Resolution"
Cohesion: 0.27
Nodes (7): resolveShortcut(), ShortcutAction, ShortcutContext, ShortcutKeyInfo, branchSelected, leafSelected, noSelection

### Community 44 - "Root Package Configuration"
Cohesion: 0.20
Nodes (9): name, private, scripts, dev, tauri, test, typecheck, version (+1 more)

### Community 45 - "XML Test Fixtures"
Cohesion: 0.22
Nodes (9): Person record for Clara with ID P-3, XML comment says the status from July 2026 still needs review, Dark themed XML editor showing a catalog with person records and a review comment, XML syntax highlighting for tags, attributes, comments, and text, Screenshot of syntax-highlighted XML showing a catalog and person elements, Person record with an ID and name fields, XML comment marking a July 2026 status for review, XML catalog containing person records (+1 more)

### Community 46 - "Core Package Metadata"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, test, typecheck, type, version

### Community 47 - "Agent Instructions and Invariants"
Cohesion: 0.29
Nodes (8): Definition of Done Workflow, graphify Skill Usage Mandate, Zentrale Invarianten (7 Core Invariants), Jaxel Project Identity, Karpathy Guidelines Reference, Mandatory Reading Order, xdp-designer Sister Project Reference, Zentrale Invarianten (7 Core Invariants)

### Community 48 - "Build and Release Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, preview, tauri, test, test:visual, typecheck

### Community 49 - "Application Entry Points"
Cohesion: 0.29
Nodes (6): catalogs, detectInitialLocale(), I18nContext, I18nContextValue, I18nProvider(), Locale

### Community 50 - "UI Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @jaxel/core, @phosphor-icons/react, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-dialog

### Community 51 - "Keyboard Navigation"
Cohesion: 0.33
Nodes (7): applyArrowIntent(), extendSelectionBy(), handleArrowLeft(), handleArrowRight(), moveSelection(), onKeyDown(), isTextInput()

### Community 52 - "VS Code Integration Tests"
Cohesion: 0.33
Nodes (5): createFakeVscodeHost(), renderEmbedded(), ref_app_js, @testing-library/react, @testing-library/user-event

### Community 53 - "Cobalt Theme Image"
Cohesion: 0.29
Nodes (7): Screenshot: Baum-Kobalt theme in XML editor, Dark navy editor theme with cobalt accents, XML tree content for person records, XML syntax highlighting, Terracotta theme XML tree screenshot, Terracotta color theme, XML tree editor interface

### Community 54 - "Keyboard Navigation Rules"
Cohesion: 0.43
Nodes (4): ArrowIntent, nextSelectedRow(), planArrowLeft(), planArrowRight()

### Community 55 - "Tree Row Behavior"
Cohesion: 0.43
Nodes (6): TreeRowView(), acceptsChildren(), childBlocker(), isInsideComment(), siblingBlocker(), TreeActionBlocker

### Community 56 - "Conversion Dialog"
Cohesion: 0.38
Nodes (3): ConvertDialogProps, NewDocumentDialogProps, DocFormat

### Community 57 - "TypeScript Toolchain"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, typescript, vitest, @types/node, typescript, vitest

### Community 58 - "Menu Bar Actions"
Cohesion: 0.33
Nodes (4): MenuBarEntry, MenuBarMenu, MenuBarProps, MenuHeading

### Community 59 - "Release Automation"
Cohesion: 0.33
Nodes (3): branch, existingTags, rl

### Community 60 - "Nordlicht Theme Image"
Cohesion: 0.40
Nodes (5): Dark blue-gray editor theme with teal, green, and pale blue syntax colors, Hierarchical XML tree with nested person entries, Screenshot of the Baum Nordlicht theme, XML syntax highlighting distinguishes tags, attributes, values, and comments, XML tree editor showing a catalog and nested person elements

### Community 61 - "Context Menu Actions"
Cohesion: 0.40
Nodes (3): ContextMenuEntry, ContextMenuItem, ContextMenuProps

### Community 62 - "XML Catalog Fixture"
Cohesion: 0.40
Nodes (5): Catalog with a visible count of 4, Person elements with IDs P-1 and P-3, Person name Clara, Comment says “Stand: Juli 2026, noch zu prüfen”, XML snippet showing a catalog and person elements

### Community 63 - "Dark Theme Image"
Cohesion: 0.50
Nodes (4): Kompakte, eingerückte Baumstruktur mit Elementnamen und Kindanzahlen, Dunkles Editor-Theme mit anthrazitfarbenem Hintergrund und gedämpften Kontrastfarben, Baumansicht im dunklen Jaxel-Theme, XML-Baumansicht mit farblich hervorgehobenen Elementen, Attributen und Kommentaren

### Community 64 - "Light Theme Image"
Cohesion: 0.50
Nodes (4): Baum-Ansicht im hellen Theme, Helles UI-Theme mit weißem Hintergrund und hellgrauer Kopfzeile, XML-Syntaxfarben: grüne Kommentare, blaue Tags und Attribute, dunkler Text, XML-Baumansicht mit Einrückung und aufklappbaren Knoten

### Community 67 - "Logo Preview and Variants"
Cohesion: 1.00
Nodes (4): Logo-Entwuerfe Vorschau (Composite: A/B/C), Logo-Entwurf A - Knotenbaum (Wurzel + zwei Kinder, Petrol auf Navy), Logo-Entwurf B - Markup-Klammern (Spitzklammern + Knotenpunkt auf Petrol), Logo-Entwurf C - J-Monogramm (Petrol-J mit Knotenpunkt auf Navy)

### Community 68 - "Tree Model Icon Motif"
Cohesion: 0.50
Nodes (4): Bildmotiv Wurzelknoten mit zwei Kindknoten als moegliche Anspielung auf das Baum-Datenmodell der App (DocNode), Farbschema Variante A: Petrol (#2cb5b3) auf dunklem Navy (#0f2430), Akzent Hellmint (#e8f4f4), Logo-Entwurf Variante A: Knotenbaum (SVG, 256x256, abgerundetes Quadrat), Status: verworfener Logo-Entwurf (Variante A), zugunsten von Variante B nicht ausgewaehlt

### Community 69 - "Jaxel App Logo"
Cohesion: 0.67
Nodes (4): Visuelle Gestaltung Variante C: petrolfarbenes J-Strichmonogramm mit Endpunkt-Kreis auf dunkelblauem Untergrund, Variante C: J-Monogramm (Logo-Entwurf, verworfen), Jaxel App-Logo/Icon-Identität (AP8, Auswahlprozess mehrerer Entwürfe), Gewählte Logo-Variante B: Markup-Klammern mit Orange-Akzent (final für AP8 übernommen)

### Community 70 - "XML Editor Screenshot"
Cohesion: 0.67
Nodes (3): XML catalog with person records and ID/name fields, Screenshot of XML source editor, Syntax-highlighted XML editor displaying a catalog fragment

### Community 71 - "Attribute Panel"
Cohesion: 1.00
Nodes (3): AttributesPanel(), handleCreate(), nameKey()

### Community 72 - "High Contrast Theme"
Cohesion: 0.67
Nodes (3): Dark themed hierarchical editor tree, Baum-Kontrast UI screenshot, Syntax color contrast

### Community 79 - "XML Comment Fixture"
Cohesion: 0.67
Nodes (3): XML comment: Stand Juli 2026, noch zu prüfen, XML document with a catalog and person elements, XML editor screenshot

### Community 80 - "Easy XML Editor Reference UI"
Cohesion: 1.00
Nodes (3): Screenshot: Easy XML Editor showing rs_binary_configuration.xml (tree + attribute panel + data table), Easy XML Editor (predecessor Windows-only app being replaced by Jaxel), Dual tree/table XML editing UI pattern (tree view + synchronized 'Daten in Tabelle' table + attribute/name-text editing panel)

## Knowledge Gaps
- **313 isolated node(s):** `SampleRow`, `I18nContextValue`, `Locale`, `AboutDialogProps`, `ReloadDialogProps` (+308 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 522 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App Actions and UI` to `New Document Commands`, `Search Panel and State`, `Right Sidebar Panels`, `Main Application Interface`, `Window Closing and View State`, `Shortcut Resolution`, `View Persistence and Menus`, `XML Comment Mutations`, `Reload Conflict Workflow`, `Keyboard Navigation`, `Workspace Document State`, `Error Boundaries`, `Tree Row Behavior`, `Tree Action Planning`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `DocNode` connect `Focus Breadcrumb Navigation` to `Search Panel and State`, `New Document Commands`, `Byte Range Save Lifecycle`, `Attribute Editing`, `Search Result Filtering`, `Change Tracking and Diff`, `Document Conversion`, `Main Application Interface`, `Tree Drag and Drop`, `Document Parsing and Formats`, `JSON Import and Arrays`, `XML Comment Mutations`, `Reload Conflict Workflow`, `JSON Serialization and Escaping`, `Workspace Document State`, `File I/O and Workspace`, `Tree Action Planning`, `Document Paths`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `JaxelHost` connect `Host Integration and Events` to `Main Application Interface`, `VS Code Integration Tests`, `Workspace Document State`, `Tauri IPC Host Adapter`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `App()` (e.g. with `displayNameOf()` and `handleFocus()`) actually correct?**
  _`App()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SampleRow`, `I18nContextValue`, `Locale` to the rest of the system?**
  _313 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Search Panel and State` be split into smaller, more focused modules?**
  _Cohesion score 0.056107539450613676 - nodes in this community are weakly interconnected._
- **Should `Focus Breadcrumb Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.11252268602540835 - nodes in this community are weakly interconnected._