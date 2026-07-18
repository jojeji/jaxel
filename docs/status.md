# Ist-Stand — Jaxel

Wird nach jedem Arbeitspaket (AP) fortgeschrieben: was wurde gebaut, warum, bewusste
Vereinfachungen, offene Punkte. Neueste Einträge oben.

## 🚦 Hier weitermachen (Stand 2026-07-18)

**AP9 ist fertig, getestet und committet (auf PO-Wunsch, Klick-Review steht noch aus)** — sechs vom PO gewünschte/nachgereichte
Features (Grilling-Details/Begründung in `docs/entscheidungen.md`, Eintrag 2026-07-18):
Fokus-Ansicht, Unterbaum-Suche, Neues Dokument, externe Änderungserkennung, Drag&Drop-Transparenz,
Über-Dialog. **Nächster Schritt: PO-Klick-Review am echten Fenster** — siehe "Verifikation" unten,
diese Session hatte wie AP7/AP8 kein Klick-Automationswerkzeug (kein xdotool/ydotool/wtype/xte
verfügbar), daher sind Rechtsklick-Kontextmenü, Fokus-Breadcrumb, alle neuen Dialoge (Neu,
Reload, Über) und die Einstellungen-Checkbox nur per jsdom-Interaktionstest abgesichert, nicht
real geklickt.

## Nachtrag 2026-07-18 — Linux-Dateizuordnung („Öffnen mit" für XML/JSON)

- **Problem**: Jaxel tauchte nach der `.deb`-Installation nicht im „Öffnen mit"-Menü des
  Dateimanagers auf. Ursache: keine `fileAssociations` in `tauri.conf.json` ⇒ die generierte
  `.desktop`-Datei hatte keinen `MimeType`-Eintrag; zusätzlich fehlte das `%F`-Feld in `Exec`
  (das Standard-Template der Tauri-CLI 2.11.4 rendert nur `Exec={{exec}}` — ohne Feldcode
  übergeben GNOME & Co. den Dateipfad beim Start gar nicht erst).
- **Lösung**: `bundle.fileAssociations` (xml → `application/xml`, json → `application/json`) plus
  eigenes Desktop-Template `src-tauri/jaxel.desktop` (`Exec=jaxel %F`,
  `Categories=Development;Utility;`), eingebunden über `bundle.linux.deb.desktopTemplate` und
  `bundle.linux.rpm.desktopTemplate`. Frontend-/Rust-Seite war bereits vorbereitet
  (`std::env::args()` → `PendingOpenPaths` → `take_pending_open_paths`), es war eine reine
  Bundle-Konfigurationslücke.
- **Verifikation**: `.deb` neu gebaut, mit `dpkg-deb -x` entpackt und die generierte
  `Jaxel.desktop` geprüft: `Exec=jaxel %F` und `MimeType=application/xml;application/json`
  vorhanden. Nicht real durchgeklickt (Installation braucht sudo) — der PO muss das neue
  `.deb` installieren und einmal per „Öffnen mit" testen.
- **Offener Punkt**: Läuft Jaxel bereits, ignoriert die zweite Instanz ihre Argumente — der
  `tauri_plugin_single_instance`-Callback in `lib.rs` ist leer (`|_app, _args, _cwd| {}`), die
  per „Öffnen mit" gewählte Datei landet dann nicht im laufenden Fenster. Fix bräuchte
  Args-Weiterleitung + ein Event, auf das das Frontend hört (bisher zieht es Startpfade nur
  einmalig beim Mount).

## AP9 — Fokus-Ansicht, Unterbaum-Suche, Neues Dokument, externe Änderungen, DnD-Transparenz,
Über-Dialog (abgeschlossen; Details/Begründung jeder Entscheidung in `docs/entscheidungen.md`,
Eintrag 2026-07-18)

- **Drag&Drop-Transparenz** (`tree/TreeView.tsx`): `setDragGhost` klont die gezogene Zeile,
  setzt sie per `dataTransfer.setDragImage` mit ~50% Deckkraft als Ghost-Bild ein (Feature-Check
  auf `setDragImage`, damit jsdom-Tests mit ihrem einfachen `dataTransfer`-Stub unverändert
  funktionieren) — löst das Problem, dass WebKitGTKs natives Drag-Bild oft blickdicht ist und
  die Einfüge-Linie darunter verdeckt.
- **Suche im Unterbaum** (`search/SearchPanel.tsx`, `App.tsx`): neue Checkbox „Nur im
  ausgewählten Unterbaum", ohne Auswahl deaktiviert, liest die aktuelle Auswahl live bei jeder
  Suche/„Alle ersetzen" neu (kein fixierter Zusatzzustand). `findAll`/`replaceAll` in core
  brauchten keine Änderung (nehmen bereits einen beliebigen Knoten als Wurzel).
- **Neues Dokument** (`state/document-store.ts`, `welcome/NewDocumentDialog.tsx`): Strg+N,
  Toolbar-Icon, Startscreen-Button, Formatwahl-Dialog. Zusätzlich (PO-Nachwunsch): Klick auf die
  freie Fläche rechts neben den Tabs (`tabs/TabBar.tsx`, `onNewDocument`-Prop; nur wenn das
  Klickziel die Leiste selbst ist, Tabs stoppen den Klick nicht extra) öffnet denselben
  Formatwahl-Dialog; Tooltip auf der Leiste weist darauf hin. XML startet mit `<root></root>`, JSON mit
  `{}` (ergibt automatisch einen leeren `$root`, kein Sonderfall in core nötig). Tab heißt bis
  zum ersten Speichern „Unbenannt-N"; Strg+S öffnet dafür automatisch den Tauri-„Speichern
  unter"-Dialog (`saveFileAs` schlüsselt den Tab danach intern auf den echten Pfad um).
- **Fokus-Ansicht ab Knoten** (größte Einzeländerung, `state/document-store.ts`,
  `tree/FocusBreadcrumb.tsx`, `App.tsx`): Rechtsklick → „Fokus ab hier öffnen" öffnet einen
  neuen Tab, der nur den Unterbaum zeigt, aber denselben CommandBus/dieselbe Undo-Historie wie
  die Vollansicht teilt (kein Klon — Invariante 1 bleibt gewahrt). Dafür wurde das
  Tab-Datenmodell aufgeteilt: `docs` (ein Eintrag pro geladenem Dokument, dedupliziert nach
  Pfad) und `tabs` (ein Eintrag pro sichtbarem Tab, Schlüssel `Pfad` oder `Pfad#Knoten-Id`) —
  mehrere Tabs (Vollansicht + beliebig viele Foki) können jetzt denselben Pfad referenzieren.
  `TreeView` bekommt weiterhin den fokussierten Knoten als „Wurzel" (`flattenTree` unverändert,
  damit Auf-/Zuklappen und Tiefe korrekt bleiben), aber jede Zeilen-`ancestors`-Kette wird
  danach um die ECHTE Vorfahrenkette bis zur wirklichen Wurzel ergänzt (`focus.ancestors`) —
  ohne das würden Mutationen im Fokus-Tab das `byteRange`-Invalidieren nur bis zum Fokus-Knoten
  statt bis zur echten Wurzel durchführen und Änderungen könnten beim minimal-invasiven
  Speichern verloren gehen. Breadcrumb-Leiste über dem Baum navigiert hoch (Klick auf die
  Wurzel verlässt den Fokus, verschmilzt dabei mit einer schon offenen Vollansicht statt sie zu
  duplizieren). Wird der fokussierte Knoten gelöscht, refokussiert eine `useEffect` in `App.tsx`
  automatisch eine Ebene höher, anhand einer beim Fokussieren mitgespeicherten
  Vorfahren-Id-Kette (der lebende Knoten ist ja weg). Neuer Core-Export `findNodeById`.
- **Externe Dateiänderungen + Reload** (`src-tauri/src/io.rs`+`lib.rs` neuer `stat_file`-Command,
  `state/document-store.ts` `reloadFile`, `state/settings-store.ts`, `App.tsx`): Prüfung nur
  beim Zurückgewinnen des Fenster-Fokus (`window`-„focus"-Event, kein Hintergrund-Watcher),
  Vergleich über mtime+Größe (kein Volltext-Reread, Rücksicht auf mehrere-100-MB-Dateien).
  `read_text_file`/`write_text_file` liefern jetzt zusätzlich `mtimeMs`/`size` zurück (camelCase
  via `#[serde(rename_all = "camelCase")]`). **Neues Dirty-Flag pro Dokument** (`isDirty`, per
  CommandBus-Subscription auf `true` gesetzt, bei Speichern/Reload auf `false`) — vorher gab es
  gar keine Undo-Historie-Unabhängige „ungespeichert"-Erkennung. Ohne eigene ungespeicherte
  Änderungen entscheidet eine neue Einstellung („Automatisch neu laden"), ob still neu geladen
  wird oder ein Dialog fragt (Default: fragen); MIT ungespeicherten Änderungen erscheint der
  Dialog immer, auch bei aktivierter Automatik. Reload baut Dokument/CommandBus komplett neu
  (Undo-Historie geht zwangsläufig verloren, neue Knoten-Ids). View-Erhalt: Auswahl und
  aufgeklappte Knoten werden vor dem Reload als `PathSegment[]` (Name + Index-unter-Geschwistern,
  aus `getPathSegments`) festgehalten und danach gegen den neuen Baum aufgelöst — neuer
  Core-Export `resolveNodeBySegments` (probiert bei fehlendem Pfad progressiv kürzere Präfixe,
  damit zumindest der nächste noch existierende Vorfahre gefunden wird). Jeder Tab (auch
  Fokus-Tabs) auf demselben Dokument wird beim Reload mit derselben Fallback-Logik neu verankert.
- **Über-Dialog** (`ui/AboutDialog.tsx`, PO-Nachtrag während der Session): Info-Icon in der
  Toolbar zeigt Versionsnummer (`@tauri-apps/api/app` `getVersion()`, spiegelt
  `tauri.conf.json`/`package.json`, außerhalb eines echten Tauri-Fensters `null`) sowie
  Joey Lauterbach und Claude (KI-Agent, Anthropic) als Entwickler.
- **Bewusste Vereinfachungen / offene Punkte**: Tab schließen warnt weiterhin NICHT vor
  ungespeicherten Änderungen (das neue `isDirty` wird bisher nur für die Reload-Konflikt-Logik
  genutzt, nicht für einen generellen Schließen-Schutz — expliziter Scope-Cut, siehe
  Entscheidungslog). Zieht man einen Knoten exakt aufs obere/untere Viertel der ERSTEN Zeile
  einer Fokus-Ansicht (= der Fokus-Knoten selbst), reiht das Ziel als ECHTES Geschwister außerhalb
  des sichtbaren Unterbaums ein (verschwindet dann sofort aus der Ansicht) — ein schmaler,
  vorbestehender Rand­fall des generischen DnD-Mechanismus, nicht eigens abgefangen.
- **Verifikation**: 60/60 Editor-Tests (18 neu: Drag&Drop-Transparenz per Typecheck/bestehende
  DnD-Tests mitabgesichert, Unterbaum-Suche 2, Neues Dokument 4, Fokus-Ansicht 5, externe
  Änderungen 6, Über-Dialog 1),
  65/65 Kern-Tests (6 neu: `findNodeById`, `resolveNodeBySegments`), `tsc --noEmit` sauber in
  beiden Paketen, `cargo check` sauber. Real mit `tauri dev` gestartet: Startscreen (neuer
  „Neues Dokument"-Button, Info-Icon in der Toolbar) und eine geöffnete Testdatei mit
  vollständiger Toolbar per Screenshot bestätigt. **Nicht real geklickt** (kein
  Automationswerkzeug in dieser Umgebung, siehe oben): Kontextmenü-Eintrag „Fokus ab hier
  öffnen", Fokus-Breadcrumb-Navigation, Reload-Dialog, Über-Dialog-Inhalt, Speichern-unter-Flow
  am echten Tauri-Dialog.

## 🚦 Vorheriger Stand (2026-07-17)

**AP0–AP8 sind fertig, getestet und committet.** Jaxel ist ein funktionierender XML/JSON-Editor
mit Minimal-Theme, Startscreen, eigenem Logo, Kontextmenü, vollständiger Tastatur-Bedienung
und Drag&Drop im Baum. Details je AP unten, neueste zuerst.

**Nächster Schritt: PO-Review von AP8 am echten Fenster.** Mangels Klick-Automation (kein
xdotool) nur per jsdom-Test abgesichert und daher real zu prüfen: (1) **Kontextmenü**
(Rechtsklick auf Baumzeile), (2) **Baum-Drag&Drop** (Einfüge-Linie/Als-Kind-Highlight),
(3) aus AP7 weiterhin offen: **Strg+V** (`navigator.clipboard.readText()` könnte in WebKitGTK
eingeschränkt sein — dann auf `@tauri-apps/plugin-clipboard-manager` umstellen) und
**Datei-Drag&Drop aufs Fenster** (die „Zuletzt geöffnet"-Liste beweist immerhin, dass der
PO mit dem neuen Build schon Dateien geöffnet hat). Danach Kandidaten wie gehabt: Artefakte
auf sauberem System testen, zurückgestellte Features (Liste unten), Windows-Packaging. Die
AP6-Bundles sind VOR AP7/AP8 gebaut — für eine Weitergabe frisch bauen
(`npm run tauri -- build --bundles appimage,deb,rpm`).

**Vor dem Weiterarbeiten unbedingt lesen:**
1. `AGENTS.md` (Projektwurzel) — Pflichtlektüre-Reihenfolge und Invarianten.
2. `docs/entscheidungen.md` — alle Grundsatzentscheidungen samt Begründung, inkl. „ausdrücklich
   NICHT geplant"-Liste (XSD-Validierung, >RAM-Editing, Byte-Identität-Invariante).
3. Dieses Dokument (`docs/status.md`), komplett — jede AP-Sektion enthält bewusste
   Vereinfachungen und gefundene Bugs, die nicht nochmal gemacht werden sollten.

**Kritische Stolperfalle beim Testen im echten Fenster:** `npm run dev` MUSS im
Projekt-Wurzelverzeichnis laufen, NICHT in `apps/editor` (dort startet das gleichnamige
`"dev"`-Skript nur Vite ohne Tauri-Fenster → `invoke()`-Aufrufe schlagen mit
`Cannot read properties of undefined (reading 'invoke')` fehl). Details in README.md.

**Wie verifizieren:**
- `packages/core`: `cd packages/core && npx vitest run` (52 Tests) + `../../node_modules/.bin/tsc
  --noEmit` (nicht bloßes `npx tsc` — greift auf dieser Maschine teils auf eine fremde
  Alt-Version zu, siehe Subagent-Berichte in den Commit-Historien).
- `apps/editor`: `cd apps/editor && npx vitest run` (21 Tests, jsdom + React Testing Library —
  kein xdotool o.ä. in dieser Umgebung verfügbar, daher sind diese Tests der Ersatz für echtes
  Klicken) + `../../node_modules/.bin/tsc --noEmit -p tsconfig.json`.
- `apps/editor/src-tauri`: `cargo check`.
- Echte App: `npm run dev` im Root, dann `gnome-screenshot` + `wmctrl -l`/`wmctrl -i -a <id>`
  nutzen, um das Jaxel-Fenster (nicht andere gleichnamige Fenster/Tabs!) zu fokussieren und zu
  screenshotten — Details siehe die Tool-Aufrufe in der Commit-Historie dieser Session.

**Bewusst zurückgestellte Features** (nicht vergessen, aber kein Blocker für AP6):
Tabellenansicht der Kindknoten, echter Multi-Fenster-Modus (eigene OS-Fenster), Namespace-
Verwaltungsdialog, Windows-/macOS-Packaging, XSD-Validierung (dauerhaft ausgeschlossen).

---

## Werkzeuge — VS-Code-Tasks/Launch, CHANGELOG (2026-07-17)

Auf PO-Wunsch: `.vscode/tasks.json` und `.vscode/launch.json` (Muster von `../xdp-designer`
übernommen, an Jaxel angepasst) sowie `CHANGELOG.md`.

- **Tasks**: „Jaxel starten" (Hintergrund-Task, Start MUSS im Root laufen, siehe Falle oben),
  „Prüfkette" (Standard-Build, Strg+Shift+B) fährt exakt die in diesem Dokument unter „Wie
  verifizieren" beschriebene Befehlskette (Tests + `../../node_modules/.bin/tsc` je Paket +
  `cargo check`) — bewusst NICHT `npm run typecheck --workspaces`, siehe dortige Begründung.
  „Alle Tests", „cargo check", „Release (Linux: AppImage/deb/rpm)" (mit dem AP6-Flag,
  schließt `nsis` aus) und „Release (Windows: nsis)".
- **Windows-Release-Task ist auf dieser Maschine NICHT lauffähig**: kein Cross-Compile-
  Toolchain (kein `mingw-w64`/`cargo-xwin`) installiert, und laut `entscheidungen.md` #7
  ohnehin bewusst erst nach Linux dran. Der Task ist trotzdem hinterlegt (inkl. PowerShell-
  Zweig) für den Tag, an dem er auf einem echten Windows-Host bzw. per Remote-Verbindung
  dorthin ausgeführt wird; auf Linux gibt er stattdessen einen klaren Hinweistext aus statt
  fälschlich Erfolg vorzutäuschen.
- **CHANGELOG.md**: Format/Ton von `../xdp-designer` übernommen (Keep a Changelog, SemVer,
  grob aus Nutzersicht, Details bleiben in diesem Dokument). Da bisher keine Version
  geschnitten wurde, steht der komplette bisherige Funktionsstand (AP0–AP8) unter
  „Unreleased" — eine erste Versionsnummer entsteht erst beim PO-Kommando „Release".
- **Verifikation**: Prüfkette-Befehlskette manuell 1:1 ausgeführt (42/42 Editor-Tests,
  `tsc` beide Pakete sauber, `cargo check` sauber). Start-Task real ausgeführt: Fenster
  öffnet, die Log-Zeile trifft exakt das im Task hinterlegte `endsPattern`-Regex. Beide
  JSON-Dateien nach dem Schreiben mit einem JSONC-tauglichen Parser gegengeprüft (VS Codes
  `tasks.json`/`launch.json` erlauben `//`-Kommentare, was reines `json.load` fälschlich als
  Fehler meldet — das Stolpern beim ersten Validierungsversuch war dieser Kommentar-Fall,
  kein echter Syntaxfehler). Windows-Zweig der Tasks konnte mangels Windows-Host nur durch
  sorgfältiges manuelles Nachrechnen der JSON-Escapes geprüft werden, nicht real ausgeführt.

## AP8 — Kontextmenü, voller Pfad, Attribut-Editing, Baum-DnD, Logo (abgeschlossen)

Vom PO per Grilling festgelegt (2026-07-17): voller Pfad = alle Ebenen inkl. Wurzel, keine
Indizes, Namespace-Präfixe abgeschnitten, als DRITTE Variante; Kontextmenü mit allen
Knoten-Aktionen; DnD mit Einfüge-Linie UND „auf Zeile = als Kind"; Logo Variante B
(Markup-Klammern) mit profiforms-Orange als Punkt.

- **Voller Pfad** (`b71b709`): `formatFullPath` in core (`path.ts`), `computePaths` liefert
  jetzt `{indexed, static, full}`. UI: Strg+Shift+C, Kontextmenü, dritter Toolbar-Button.
  Achtung: der Strg+C-Handler (Knoten kopieren) prüft jetzt explizit `!shiftKey`.
- **Kontextmenü** (`apps/editor/src/ui/ContextMenu.tsx`): Rechtsklick selektiert die Zeile
  und öffnet das Menü (Pfad-Varianten, Kind anlegen, Duplizieren, Kopieren/Einfügen, Löschen,
  je mit Shortcut-Hinweis; Wurzel-Aktionen deaktiviert). Schließt bei Klick/Esc/Rechtsklick
  daneben, klemmt sich an Viewport-Ränder.
- **Attribut-Editing**: Namen sind editierbar (`createRenameAttributeCommand`, adressiert per
  Index, damit Live-Tippen dasselbe Attribut trifft); neues Attribut entsteht SOFORT beim
  Tippen im Namensfeld (kein „+"-Button mehr), Fokus springt in die neue Zeile.
  **Neu im CommandBus: `coalesceKey`** — aufeinanderfolgende Commands mit gleichem Schlüssel
  verschmelzen zu EINEM Undo-Schritt. Damit ist die Tipp-Kette „Attribut anlegen + Name
  tippen" ein Schritt, Wert-Tippen ein zweiter — und das vorher schon bestehende
  Ein-Undo-pro-Buchstabe-Verhalten der Wert-Felder ist mitrepariert (Invariante „ein
  sichtbarer Nutzerschritt = ein Undo-Schritt"). Bewusste Vereinfachung: die Kette bricht
  erst beim nächsten anderen Command, nicht beim Fokusverlust — zwei getrennte
  Tipp-Sitzungen am selben Feld ohne Aktion dazwischen verschmelzen zu einem Schritt.
- **Baum-DnD**: HTML5-DnD in `TreeView` über das vorhandene `createMoveNodeCommand`.
  Oberes/unteres Viertel der Zeile = Einfüge-Linie davor/danach (Geschwister, Linie eingerückt
  auf Zielebene via `--indent`-CSS-Variable), Mitte = Zeile hervorgehoben, Ablegen als letztes
  Kind (Ziel wird auto-expandiert). Gesperrt: Wurzel ziehen, in den eigenen Unterbaum,
  Geschwister der Wurzel. Same-Parent-Index-Korrektur gemäß Command-Contract beachtet.
  **Test-Stolperfalle**: jsdom kennt kein `DragEvent` — `fireEvent.dragOver` verwirft
  `clientY`; im Test daher ein `MouseEvent("dragover")` mit manuell angehängtem
  `dataTransfer` dispatchen (siehe App.test.tsx).
- **Logo** (`0cf643a`): drei Entwürfe (`assets/logo-drafts/`, Vorschau `preview.png`), PO
  wählte Variante B (weiße Spitzklammern auf Petrol, Punkt in profiforms-Orange #ED6C13).
  Rasterisierung SVG→1024px-PNG via **headless Chrome** (`--default-background-color=00000000`
  für Transparenz — rsvg/inkscape/cairosvg fehlen auf dieser Maschine), Icon-Satz per
  `npm run tauri -- icon` (Android/iOS-Output verworfen). Logo auch auf dem Startscreen.
- **Vom PO gefundener Bug, behoben**: XML öffnen → suchen → zweites Dokument (JSON) öffnen
  stürzte ab („computePaths: node … is not root \"$root\" …"). Ursache: das Suchpanel behielt
  seine Trefferliste (lebende Knoten-Referenzen ins ALTE Dokument) über den Tab-Wechsel und
  löste deren Pfade gegen die neue Wurzel auf. Fix: `SearchPanel` wird per
  `key={activeDoc.filePath}` pro Dokument neu aufgesetzt (Treffer/Query/Filter können einen
  Tab-Wechsel nie überleben), zusätzlich ist `getMatchPath` jetzt absturzsicher (try/catch —
  ein Listen-Label darf nie die App reißen). Regressionstest in App.test.tsx.
- **Verifikation**: 42/42 Editor-Tests (8 neue), 59/59 Core-Tests (5 neue: Coalescing,
  rename-attribute, formatFullPath), `tsc` sauber. Real: App gestartet, neues Fenster-Icon
  (`_NET_WM_ICON` gesetzt) und Startscreen mit Logo per Screenshot bestätigt; Kontextmenü und
  DnD real klicken steht als PO-Review aus (kein Klick-Automationswerkzeug, siehe oben).

## AP7 — Feinschliff Optik + Bedienung (abgeschlossen; 2 Punkte für PO-Klick-Review offen)

Vom PO per Grilling festgelegt (AskUserQuestion-Runde, 2026-07-17): Minimal-Stil mit Petrol als
einzigem Akzent, Hell als Default-Theme, Startscreen mit allen drei Elementen, Suchpanel per
Strg+F einblendbar, Filter = Treffer+Vorfahren (Unterbaum als Einstellung), Doppelklick
kontextabhängig, Clipboard über System-Zwischenablage, Toolbar als Icons+Tooltips.

**AP7a — Bedienung** (`f5b506c`):
- Klick selektiert + klappt auf/zu; Doppelklick editiert kontextabhängig (Name/Wert);
  Pfeiltasten-Navigation (↑↓ Zeilen, → auf/ins Kind, ← zu/zum Eltern); Enter=Wert, F2=Name.
- Strg+D dupliziert (neues `cloneSubtree` in core: frische Ids, KEINE byteRanges — ein Klon mit
  altem byteRange würde beim minimal-invasiven Speichern fremde Bytes kopieren). Strg+C/V über
  die System-Zwischenablage: Copy serialisiert das Fragment (XML via `serializeXml` ohne
  Deklaration, JSON als Ein-Schlüssel-Objekt `{"name": …}` — rundreisefähig durch `parseJson`),
  Paste parst, klont und fügt als nächstes Geschwister ein (Wurzel: als letztes Kind);
  synthetische JSON-Wurzeln (`$root`) werden mit Fehlermeldung abgelehnt. Strg+Plus legt ein
  Kind an und springt SOFORT in die Namens-Eingabe.
- Suche als unten angedocktes Panel: klickbare Trefferliste (indizierter Pfad + Fundstelle,
  gedeckelt auf 200 gerenderte Einträge), Filtermodus (`tree/filter.ts`), Ersetzen wie gehabt.
- Datei-Dialog startet im zuletzt benutzten Ordner (`state/local-prefs.ts`, localStorage).
- **Architektur-Refactor**: `expanded`-State und die abgeflachte Zeilenliste sind von TreeView
  nach App gewandert (TreeView bekommt fertige `rows`) — nötig, damit Pfeiltasten-Navigation
  und Filter dieselbe sichtbare Liste sehen. Virtualisierung unverändert.

**AP7b — Optik** (`0e10701`):
- Theme-Rework beider Modi: warm-neutrale Flächen, 1px-Trennlinien, Petrol als EINZIGER Akzent
  (Orange entfernt), **Hell ist neuer Default** (CSS `:root`; Dunkel via `data-theme="dark"` —
  Logik in App.tsx entsprechend gedreht). Fokus-Ringe, Hover/Active-Feedback.
- Startscreen: Marke, normal großer Öffnen-Button, „Zuletzt geöffnet"-Liste, Tastenkürzel-
  Übersicht, Drag&Drop (Tauri `onDragDropEvent`, außerhalb Tauris automatisch inaktiv).
  Der bisherige Riesen-Button war ein CSS-Bug (`align-items: stretch` auf `.app-main`).
- Toolbar: Phosphor-Icon-Buttons (einzige neue Dependency `@phosphor-icons/react`) mit
  Tooltip inkl. Shortcut, immer sichtbar + deaktiviert statt versteckt; neu: Duplizieren-Button,
  Strg+O/Strg+S.
- **Verifikation**: 34/34 Editor-Tests (13 neue), 54/54 Core-Tests, `tsc` sauber. Real mit
  `tauri dev` verifiziert: Startscreen hell, Baum hell + dunkel per Screenshot; beim dunklen
  Screenshot sah die Tab-Leiste in der VERKLEINERTEN Vorschau hell aus — Pixelprobe (PIL) ergab
  korrektes `#191e24`, also kein Theme-Bruch. Dark-Theme-Test via direktem Schreiben von
  `jaxel.settings` in die WebKit-localStorage-SQLite (`~/.local/share/de.profiforms.jaxel/
  localstorage/…`), danach zurückgesetzt.
- **Bewusste Vereinfachungen / offen**: Strg+V und Drag&Drop real noch nicht geklickt (siehe
  „Hier weitermachen"); Strg+Plus erzeugt zwei Undo-Schritte (Einfügen + Umbenennen); Auswahl
  geht verloren, wenn ein Vorfahre zugeklappt wird; kein Kontextmenü (weiterhin offen);
  „Zuletzt geöffnet" füllt sich erst durch Öffnen mit der neuen Version.
- **Stolperfalle Dev-Server**: `npm run dev` scheitert mit „Port 1420 is already in use", wenn
  ein verwaister Vite aus einer früheren Session läuft — Prozess auf Port 1420 finden
  (`ss -tlnp | grep 1420`) und beenden. Tauri startet die App trotzdem kurz an (Fenster ohne
  funktionierenden Dev-Server) — dieses Zombie-Fenster ebenfalls schließen.

## AP6 — Linux-Packaging (abgeschlossen; Test auf sauberem System noch offen)

- **Build**: `npm run tauri -- build --bundles appimage,deb,rpm` im Projekt-Root. Das
  `--bundles`-Flag ist Absicht: `tauri.conf.json` listet auch `nsis` (Windows-Installer), das auf
  einem Linux-Host ohne Cross-Build-Toolchain nicht baubar ist — statt die Config zu ändern, wird
  das Ziel beim Linux-Build per Flag eingeschränkt. Build-Dauer: ca. 2 Minuten (Rust-Release-
  Compile), Frontend-`tsc`+`vite build` laufen automatisch vorher (`beforeBuildCommand`).
- **Artefakte** unter `apps/editor/src-tauri/target/release/bundle/`:
  `appimage/Jaxel_0.1.0_amd64.AppImage` (76 MB, portabel), `deb/Jaxel_0.1.0_amd64.deb` (4 MB),
  `rpm/Jaxel-0.1.0-1.x86_64.rpm` (4 MB).
- **Verifikation**: AppImage direkt (ohne Installation) mit einer XML-Datei als Argument
  gestartet — Fenster öffnet, Baum wird korrekt angezeigt, Toolbar/Tabs/Attribute-Panel da,
  per Screenshot bestätigt. Das CLI-Argument-Öffnen aus AP2 funktioniert also auch im
  Release-Bundle. deb-Inhalt geprüft (`dpkg-deb -c`): `/usr/bin/jaxel`, `Jaxel.desktop`,
  Icons 32/128/256px — vollständig.
- **Stolperfalle beim Screenshot-Verifizieren (erneut bestätigt)**: `wmctrl | grep -i jaxel`
  traf zuerst einen alten Browser-Tab namens „Jaxel" — immer die Fenster-ID des echten
  Tauri-Fensters (exakter Titel `Jaxel`, passende PID via `wmctrl -lp`) verwenden.
- **Offen / bewusst nicht gemacht**: Test auf einem sauberen System ohne Dev-Toolchain steht
  aus (auf dieser Maschine nicht möglich — kein VM-/Container-Setup mit Display eingerichtet);
  rpm-Inhalt nicht inspiziert (`rpm`-CLI hier nicht installiert), das Paket wurde aber vom
  selben Bundler-Lauf erzeugt wie das geprüfte deb; keine Signierung/kein Update-Mechanismus
  (nicht gefordert); Windows/macOS-Packaging bewusst NICHT Teil von AP6
  (`docs/entscheidungen.md` #7: Linux zuerst).

## AP5 — Tabs, Grundeinstellungen (abgeschlossen; „eigene Fenster"-Modus bewusst zurückgestellt)

- **Tabs** (`apps/editor/src/state/document-store.ts` umgebaut auf `useJaxelDocuments()`,
  `apps/editor/src/tabs/TabBar.tsx`): mehrere Dokumente gleichzeitig offen, je Dateipfad ein
  Tab. Datei erneut öffnen aktiviert den vorhandenen Tab statt einen Duplikat-Tab zu erzeugen.
  Tab schließen aktiviert automatisch den Nachbar-Tab. Undo/Redo, Suche, Auswahl etc. beziehen
  sich immer auf den AKTIVEN Tab (`activeDoc`); Auswahl/Editier-Zustand wird beim Tab-Wechsel
  zurückgesetzt.
- **Grundeinstellungen** (`apps/editor/src/state/settings-store.ts`, `.../settings/
  SettingsDialog.tsx`): Theme und Fenster-Modus jetzt in `localStorage` persistiert (`jaxel.
  settings`) statt nur als React-State (Theme ging bisher bei jedem Neuladen verloren — Sprache
  war bereits über den i18n-Provider persistiert). Dialog bündelt Theme, Sprache,
  Fenster-Modus an einer Stelle statt einzelner Toolbar-Buttons.
- **„Eigene Fenster"-Modus bewusst NICHT implementiert**: die Einstellung ist im Dialog
  sichtbar, aber als Radio-Option deaktiviert mit Hinweistext „kommt in einer späteren
  Version" — echte OS-Fenster pro Dokument brauchen Tauris `WebviewWindow`-API und eine
  pro-Fenster-State-Architektur, was den Rahmen dieses Arbeitspakets gesprengt hätte. Bewusst
  ehrlich sichtbar statt stillschweigend weggelassen, damit die Anforderung nicht vergessen wird.
- **Verifikation**: 21/21 Editor-Tests grün (3 neu für Tabs: öffnen/wechseln/schließen, 2 neu
  für Einstellungen: Theme-Persistenz, deaktivierte Fenster-Option), 52/52 Kern-Tests weiterhin
  grün, `tsc --noEmit` sauber in beiden Paketen, `cargo check` sauber. Real mit `tauri dev`
  gestartet und die neue Tab-Leiste + der „Einstellungen"-Button per Screenshot bestätigt.

## AP4 — Suchen/Ersetzen + Pfad-Kopieren (abgeschlossen; Tabellenansicht bewusst zurückgestellt)

- **Suchen/Ersetzen** (`apps/editor/src/search/SearchBar.tsx`): Suchleiste mit Scope
  (Name/Wert/Attribute/Alles), Groß-/Kleinschreibung, Regex, Treffer-Zähler ("3/7"),
  Weiter/Zurück (zyklisch), Ersetzen-durch-Feld, „Alle ersetzen". Nutzt `findAll`/`replaceAll`
  aus `packages/core`. `Strg+F` öffnet die Leiste.
- **„Alle ersetzen" ist ein einziger, echter Undo-Schritt**: `replaceAll` mutiert direkt (siehe
  AP1), daher wird vor dem Aufruf der Vorher-Zustand jedes betroffenen Feldes eingesammelt,
  nach dem Aufruf zurückgesetzt und über die bestehenden Mutations-Commands
  (`createRenameCommand`/`createSetValueCommand`/`createSetAttributeCommand`) innerhalb eines
  `createCompositeCommand` neu angewendet — dadurch bleibt Undo/Redo für Massen-Ersetzungen
  konsistent mit dem Rest der App, ohne `search.ts` selbst anzufassen.
- **Treffer-Navigation expandiert automatisch**: `TreeView` hat jetzt eine `revealNodeId`-Prop
  — beim Springen zu einem Treffer werden alle Vorfahren automatisch aufgeklappt und die
  Zeile in den sichtbaren Bereich gescrollt (auch bei virtualisierter Darstellung).
- **Pfad kopieren**: zwei Toolbar-Buttons für den ausgewählten Knoten (indiziert
  `person[1].city` / statisch `person.city`), nutzt `computePaths` aus `packages/core` und
  `navigator.clipboard.writeText`.
- **Test-Stolperfalle gefunden und dokumentiert** (kein App-Bug): `@testing-library/user-event`s
  `setup()` installiert unconditional einen eigenen Clipboard-Stub auf `navigator.clipboard`
  (via Getter), der NACH einem in `beforeEach` gesetzten Mock läuft und diesen überschreibt.
  Der Clipboard-Mock muss daher NACH `userEvent.setup()` (implizit in `openSampleFile()`)
  gesetzt werden — siehe `stubClipboard()`-Kommentar in `App.test.tsx`.
- **Verifikation**: 16/16 Editor-Tests grün (4 neu für Suche/Ersetzen, 1 neu für Pfad-Kopieren),
  52/52 Kern-Tests weiterhin grün, `tsc --noEmit` sauber in beiden Paketen, `cargo check`
  sauber. Real mit `tauri dev -- sample.xml` gestartet und die neue „Suchen"-Toolbar-Schaltfläche
  per Screenshot bestätigt.
- **Bewusst zurückgestellt**: die aus den Referenz-Screenshots inspirierte Tabellenansicht der
  Kindknoten ("Daten in Tabelle") wurde NICHT gebaut — sie war kein expliziter Kernwunsch (im
  Gegensatz zu Suchen/Ersetzen und Pfad-Kopieren) und wird als spätere Ausbaustufe geführt.

## AP3 — Editieren (abgeschlossen, per Screenshot + Interaktionstests verifiziert)

- **Wert editieren**: Doppelklick auf einen Blattwert → Inline-Input, Enter/Blur übernimmt
  (`createSetValueCommand`), Escape bricht ab.
- **Umbenennen**: Klick auf den Namen eines BEREITS ausgewählten Knotens (Finder-Stil,
  zweiter Klick) ODER `F2` → Inline-Input für den Namen, Enter/Blur übernimmt
  (`createRenameCommand`).
- **Attribute-Panel** (`apps/editor/src/panels/AttributesPanel.tsx`): zeigt Attribute des
  ausgewählten Knotens, jedes per Input direkt änderbar, `×` entfernt, eigene Zeile zum
  Hinzufügen — alles über `createSetAttributeCommand`.
- **Undo/Redo**: `Strg+Z`/`Strg+Shift+Z`/`Strg+Y` global verdrahtet (ignoriert Tastendrücke,
  während ein Textfeld fokussiert ist, damit natives Text-Undo dort nicht überschrieben wird).
- **Knoten einfügen/löschen**: Toolbar-Buttons „Kind hinzufügen" (`createInsertNodeCommand`,
  neuer Knoten namens `node`) und „Löschen" (`createRemoveNodeCommand`, plus `Delete`/
  `Backspace`-Hotkey). Wurzelknoten kann nicht gelöscht werden.
- **Wichtiger Bug gefunden und behoben** (durch die neu eingeführten Interaktionstests, nicht
  durch bloßes Ansehen): `TreeView`s `useMemo` für die abgeflachte Zeilenliste hing nur an
  `[root, expanded]`. Da Commands den Baum IN PLACE mutieren, ändert sich `root` bei keiner
  Mutation die Referenz — Name-/Wert-Änderungen wirkten trotzdem sichtbar (weil jede bereits
  gerenderte Zeile ihr lebendes `DocNode`-Feld direkt liest), aber STRUKTURELLE Änderungen
  (Kind einfügen/löschen) erschienen im Baum überhaupt nicht, weil die Zeilenliste nie neu
  berechnet wurde. **Fix**: `revision` (von `CommandBus`/`JaxelDocument.revision`) wird jetzt
  als Prop durchgereicht und ist Teil der `useMemo`-Dependency-Liste.
- **Test-Infrastruktur neu**: `apps/editor` hat jetzt vitest + jsdom + React Testing Library
  (`npm test` in `apps/editor`, 12 Tests, alle grün) — nötig, weil in dieser Umgebung keine
  GUI-Automatisierung (kein xdotool o.ä.) zur Verfügung steht, um echte Klicks zu simulieren.
  Diese Tests decken exakt die AP3-Interaktionen ab (Auswahl, Umbenennen inkl. Escape-Abbruch,
  F2, Wert-Doppelklick, Undo/Redo, Attribute hinzufügen/ändern/entfernen, Kind einfügen/löschen)
  und sind die Regressionssicherung für spätere AP4/AP5-Arbeit an derselben UI.
- **Verifikation**: `apps/editor`-Tests grün (12/12), `packages/core`-Tests weiterhin grün
  (52/52), `tsc --noEmit` sauber in beiden Paketen, `cargo check` sauber. Zusätzlich real mit
  `tauri dev -- sample.xml` gestartet und per Screenshot bestätigt (sauberer Neustart nach den
  Fixes zeigt den Baum korrekt).
- **Offen für AP4+**: kein Kontextmenü (nur Toolbar-Buttons), neu eingefügte Knoten werden
  nicht automatisch ausgewählt/in Rename-Modus versetzt, Elternknoten wird beim Einfügen des
  ersten Kindes nicht automatisch aufgeklappt — bewusste Vereinfachungen für „Feinschliff
  später" (PO-Freigabe).

## AP2 — Baumansicht + Datei öffnen (abgeschlossen, vom PO live bestätigt)

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
