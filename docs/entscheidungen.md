# Entscheidungslog — Jaxel

Maßgeblich bei Widersprüchen zu anderen Dokumenten. Neue Entscheidungen werden unten angehängt
(nicht editiert), mit Datum und Begründung.

## 2026-07-17 — Kickoff-Grilling (Interview mit dem PO vor Projektstart)

1. **Round-Trip: format-erhaltend, best effort — kein hartes Byte-Identität-Invariant.**
   Unveränderte Bereiche (Kommentare, PIs, CDATA, Attributreihenfolge, Whitespace) bleiben
   byte-identisch; nur tatsächlich bearbeitete Knoten werden nach einer konfigurierbaren
   Einrückungsregel neu geschrieben. Anders als bei xdp-designer (dort: strikte
   Byte-Identität-Invariante mit Fixture-Test-Suite), weil Jaxel ein General-Purpose-Editor für
   beliebige XML/JSON-Dateien ist — die Dateivielfalt ist zu groß für einen engen, garantierten
   Fixture-Korpus.

2. **Stack: Tauri 2 + Rust-Kern + React 18 + TypeScript + Vite** (identisch zu xdp-designer).
   Begründung: kleine Binärgröße, geringer RAM-Verbrauch, natives Rust-Parsing für große Dateien
   deutlich schneller als reines Node/JS. Toolchain lokal verifiziert (Node 18.19.1, rustc 1.97.0,
   webkit2gtk-4.1 vorhanden) — anders als bei xdp-designer, wo Rust in der Umgebung zeitweise fehlte.

3. **Große Dateien: Streaming-Parse + Byte-Offset-Index, ganze Datei im RAM, virtualisierte
   Baumansicht.** Kein Editieren von Dateien größer als der verfügbare RAM — das wäre ein deutlich
   höherer Implementierungsaufwand (Undo/Redo, Suche, Speichern müssten alle mit Teildaten
   arbeiten) und war laut PO nicht der eigentliche Bedarf ("mehrere 100 MB", nicht "größer als RAM").

4. **XML↔JSON-Vereinheitlichung: eigene einfache Konvention statt Badgerfish o.ä.**
   Gemeinsames Node-Modell `{name, attributes[], value, children[]}`. JSON-Objekt → Knoten mit
   einem Kindknoten je Property; JSON-Array → mehrere gleichnamige Kindknoten (daraus ergibt sich
   automatisch der gewünschte indizierte Pfad `a.b[0].c`); JSON-Primitive → Textwert. Etablierte
   Konventionen wie Badgerfish (`@attr`, `$`) wurden bewusst verworfen, weil sie für
   XML→JSON-Konvertierung gemacht sind und in der Baumansicht künstliche Präfixe erzeugen würden,
   die es im echten JSON nicht gibt — die Anzeige ist wichtiger als Standardkonformität.

5. **Multi-Window: Tabs als Standard, echte OS-Fenster über Einstellung optional.**
   Begründung: entspricht dem Alltagsverhalten moderner Editoren (VS Code, Notepad++); deckt aber
   den vom PO gewünschten Fenster-Modus als Option ab.

6. **Namespaces: V1 erhält sie nur korrekt (xmlns als Attribut, Prefixe bleiben erhalten).**
   Ein dedizierter "Namespaces verwalten"-Dialog (siehe Easy-XML-Screenshot) ist bewusst auf eine
   spätere Ausbaustufe verschoben, um den Kernumfang von V1 nicht zu sprengen.

7. **Plattform-Reihenfolge: Linux zuerst, dann Windows, macOS optional zuletzt.**
   Linux ist das akute Problem des PO (kein Easy-XML für Linux). Tauri baut dieselbe Codebasis für
   alle Plattformen; Windows-Build folgt sobald der Kern-Editor stabil läuft. macOS erfordert
   Code-Signing/Notarization ohne vorhandenen Apple-Dev-Account und ist daher nachrangig.

8. **Pakete: Linux = AppImage (portabel) + .deb/.rpm (installierbar); Windows = portable .exe +
   .msi/NSIS (installierbar).** Deckt beide vom PO geforderten Distributionsformen pro Plattform ab,
   alle vier nativ über Tauri-Bundle-Konfiguration.

9. **Kodierung: UTF-8/UTF-16 nativ + Auto-Erkennung von ISO-8859-1/Windows-1252 über die
   XML-Deklaration, via `encoding_rs`.** Begründung: Business-/SAP-nahe XML-Dateien (z.B.
   Reportwriter-Exporte) nutzen häufig Alt-Encodings. Ursprungskodierung wird beim Speichern
   beibehalten, sofern nicht explizit geändert.

10. **Keine XSD/DTD-Schemavalidierung — auch nicht als spätere Ausbaustufe.** Bewusst außerhalb des
    Projektumfangs; explizit vom PO so entschieden (nicht nur "später", sondern "nicht relevant").

11. **UI-Sprache: Deutsch + Englisch von Anfang an** (anders als xdp-designer, das rein Deutsch ist).
    Eigener schlanker i18n-Layer (kein schweres Framework wie react-i18next nötig für zwei Sprachen).

12. **Produktname: Jaxel** (JSON + XML). Slogan „Ein Baum, zwei Formate". Optionales Maskottchen
    später: Jaxolotl (Axolotl). Rein kosmetisch, jederzeit änderbar.

13. **Arbeitsmodus: autonom bis zum ersten lauffähigen Linux-Editor** (AP0–AP5), keine
    Zwischenabnahmen pro Arbeitspaket. Packaging (AP6/AP7) danach.

## 2026-07-17 — Bekannte Einschränkung der JSON-Array-Konvention (entdeckt bei der Implementierung von AP1)

Aus Entscheidung #4 ("JSON-Array → mehrere gleichnamige Geschwisterknoten") folgt eine bewusst in
Kauf genommene Nebenwirkung: Ein Array mit genau einem Element ist im Baum nicht von einem
nackten Einzelwert zu unterscheiden. `{"tags": ["x"]}` und `{"tags": "x"}` erzeugen denselben
Baum (ein Knoten `tags` mit Wert `"x"`) und `serializeJson` gibt beim Speichern in beiden Fällen
`{"tags": "x"}` zurück — das Array-Wrapping eines Einzelelements geht verloren. Ebenso erzeugt ein
leeres Array als Property-Wert (`{"tags": []}`) null Kindknoten, wodurch der Schlüssel `tags` beim
erneuten Speichern komplett verschwindet statt als `[]` zu erscheinen.

Das ist keine Bug, sondern eine unmittelbare Konsequenz der in #4 gewählten, absichtlich einfachen
Konvention (kein Wrapper-Knoten pro Array). Betrifft nur JSON-Dokumente, deren Struktur sich exakt
auf diese Randfälle stützt (Ein-Element-Arrays, leere Arrays als Property-Wert). Falls das in der
Praxis stört, wäre die Abhilfe ein optionales `arrayHint`-Flag am Knoten (Property war im Original
ein Array) — bewusst nicht in V1 gebaut, da es die Konvention verkompliziert, ohne dass ein
konkreter Bedarf danach besteht.

## 2026-07-18 — Grilling: Fokus-Ansicht, Unterbaum-Suche, Neu anlegen, externe Änderungen, DnD-Transparenz

Fünf vom PO gewünschte Features, per Grilling (AskUserQuestion-Runde) festgelegt, bevor die
Umsetzung beginnt.

1. **"Virtuelles Dokument ab Knoten X" = fokussierte Ansicht auf denselben lebenden Baum, kein
   Klon.** Neuer Tab zeigt nur den Unterbaum, aber Bearbeiten/Undo/Speichern wirken weiterhin auf
   das eine echte Dokument — ein separates Klon-Dokument hätte Invariante 1 ("geparster Baum ist
   die einzige Wahrheit, kein Parallel-Modell") verletzt. Tab-Identität wird **Pfad + Knoten-Id**
   (nicht nur Pfad wie bisher), damit mehrere Fokus-Tabs (und Fokus + Vollansicht) auf demselben
   Dokument gleichzeitig offen sein können; alle teilen sich CommandBus/Undo/Speichern. Navigation
   per **Breadcrumb-Leiste** über dem Baum (echte Wurzel bis Fokus-Knoten, klickbar, Klick auf
   höheres Element verschiebt den Fokus dorthin — bis zur Wurzel = Fokus verlassen). Wird der
   fokussierte Knoten gelöscht (z. B. aus einem anderen Tab auf demselben Dokument), springt der
   Fokus automatisch eine Ebene höher (bis maximal zur echten Wurzel) statt den Tab zu schließen.
   Rechtsklick-Aktion auf der Wurzel selbst ist sinnlos (identisch zur Vollansicht) und wird nicht
   angeboten.

2. **Suche im Unterbaum**: neue Checkbox im SearchPanel neben den bestehenden Optionen, schließt
   den ausgewählten Knoten selbst ein (nicht nur Nachfahren). Ohne Auswahl deaktiviert/fällt auf
   Gesamtdokument zurück. Verhält sich **live** — folgt bei jeder Suche der aktuell im Baum
   ausgewählten Zeile, kein fixierter Zusatzzustand (konsistent zu den bestehenden Scope-Optionen
   Name/Wert/Attribute, die genauso live aus dem UI-Zustand gelesen werden). `findAll`/`replaceAll`
   in core nehmen bereits einen beliebigen Knoten als Wurzel entgegen — kein Core-Änderungsbedarf.

3. **Neues Dokument anlegen (XML und JSON)**: Einstieg konsistent zu "Datei öffnen" — Strg+N,
   Toolbar-Icon, Startscreen-Button. Dialog fragt das Format ab. XML startet mit leerem
   Wurzelknoten `<root></root>` (Name direkt wie jeder andere Knoten umbenennbar, kein
   Extra-Abfragedialog für den Namen). Tab heißt bis zum ersten Speichern **"Unbenannt-1"**
   (fortlaufend nummeriert, da Tabs bisher eindeutig über den Dateipfad identifiziert waren und ein
   neues Dokument noch keinen hat); Strg+S öffnet automatisch "Speichern unter"; nach erfolgreichem
   Speichern wird der Tab intern auf den echten Pfad umgeschlüsselt.

4. **Erkennung externer Dateiänderungen + Reload**: Prüfung nur **beim Fokus-Zurückgewinnen des
   Fensters** (wie VS Code/Notepad++), kein Hintergrund-Datei-Watcher (kein neuer Rust-Dependency
   wie `notify` nötig). Vergleichsmethode: **Datei-Metadaten (mtime + Größe)** über einen neuen
   schlanken Rust-Command — bewusst kein Volltextvergleich, mit Rücksicht auf die mehrere-100-MB-
   Dateien, die Jaxel unterstützen soll (siehe `architektur.md`). Bei Änderung ohne eigene
   ungespeicherte Änderungen: eine neue Einstellung (SettingsDialog) steuert, ob automatisch neu
   geladen wird oder ein Dialog nachfragt (Default: Dialog). Bei Änderung **mit** eigenen
   ungespeicherten Änderungen erscheint **immer** der Dialog, auch wenn "automatisch" aktiv ist, mit
   Warnhinweis, dass die eigenen Änderungen beim Neuladen verloren gehen. Dafür wird erstmals ein
   **Dirty-Flag pro Dokument** gebraucht (gibt es aktuell gar nicht — auch Tab schließen warnt
   bisher nicht vor Datenverlust; das bleibt ein offener, hier nicht behobener Punkt, siehe
   `status.md`). Nach einem Reload wird die Ansicht bestmöglich erhalten: Auswahl und aufgeklappte
   Knoten werden anhand des **indizierten Pfads** wiederhergestellt (nicht der Knoten-Id, die bei
   jedem Parse neu vergeben wird), soweit der Pfad im neuen Baum noch existiert — sonst greift der
   gleiche Fallback wie bei Punkt 1 (nächster noch existierender Vorfahre). Die Undo-Historie geht
   bei einem Reload zwangsläufig verloren (neuer Baum = neue Knoten-Ids). Betrifft alle Tabs
   (Vollansicht + Fokus-Tabs), die auf dasselbe Dokument zeigen, gemeinsam.

5. **Baum-Drag&Drop-Transparenz**: eigenes, halbtransparentes Drag-Bild via
   `dataTransfer.setDragImage()` (statt sich auf das browser-/WebKitGTK-native, oft blickdichte
   Ghost-Bild zu verlassen) — damit die Einfüge-Linie/Als-Kind-Markierung darunter sichtbar bleibt.

## 2026-07-18 — Grilling: Base64-Decode-Ansicht + Desktop-Reife (Planung, noch nicht gebaut)

Vorbild ist das Base64-Feature aus dem PO-Projekt `vscode-tci` (bo4e-Ordner): dort dekodiert eine
CodeLens `<file>…</file>`-Inhalte aus Spooler-VOL-XMLs und öffnet sie fest verdrahtet als PDF.
Für Jaxel wurde im Interview entschieden:

1. **Erkennung: Heuristik + Kontextmenü-Fallback.** Kein Schema-/Attributwissen nötig: ein Wert
   (Elementinhalt ODER Attributwert) gilt als Base64-Kandidat, wenn er Mindestlänge, gültiges
   Base64-Alphabet und Dekodierbarkeit erfüllt. Die Heuristik läuft nur über die gerade
   **sichtbaren Baumzeilen** (Rücksicht auf sehr große Dateien). Zusätzlich gibt es auf jedem
   Knoten einen manuellen Kontextmenüpunkt „Als Base64 dekodieren" — für Fälle, die die Heuristik
   nicht greift.
2. **Sichtbarkeit: klickbares „base64"-Badge in der Baumzeile** (analog CodeLens), Klick
   dekodiert sofort.
3. **Anzeige zweigleisig per Magic-Byte-Erkennung** (%PDF, PNG, ZIP …): Binärinhalte werden als
   temporäre Datei gespeichert und mit dem System-Standardprogramm geöffnet; Textinhalte zeigt
   ein Vorschau-Dialog in Jaxel; ist der Text XML oder JSON, gibt es zusätzlich „Als neuen Tab
   öffnen" (eigenständiges Dokument, keine Verknüpfung zur Quelle).
4. **Read-only, kein Re-Encode** (bewusster Scope-Cut): Dekodieren ist reine Ansicht. Ein
   Rückweg (Bearbeiten + Zurückschreiben als Command) kann später ein eigenes AP werden.

**Priorisierung der Desktop-Reife-Lücken durch den PO** (in dieser Reihenfolge einplanen):
1. **Ungespeichert-Warnung** beim Tab- UND Fenster-Schließen (nutzt das AP9-`isDirty`-Flag).
2. **„Öffnen mit" bei laufender App**: zweite Instanz reicht Dateipfade an die laufende Instanz
   weiter (`single_instance`-Callback + Event ans Frontend).
3. **Sitzung wiederherstellen** beim Start (per Einstellung abschaltbar).

Zurückgestellt (nicht abgewählt, aber ohne Termin): Update-Hinweis im Über-Dialog,
„Logdatei öffnen"-Button.

## 2026-07-19 — Grilling: Absturz- und Fehler-Logging (AP15)

Auslöser: die seit AP14 erreichbare Logdatei war 0 Bytes, weil nirgends geloggt wurde.
Im Grilling geklärte Grundsatzentscheidungen (Details in `.scratch/ap15-crash-logging/spec.md`):

1. **Datenschutz-Invariante: nur Pfade, Fehlermeldungen, Version, technische Metadaten.**
   Niemals Dokumentinhalte, Knotenwerte, Suchbegriffe oder dekodierte Base64-Nutzdaten im Log —
   gilt für alle künftigen Logging-Erweiterungen, nicht nur AP15.
2. **Breadcrumbs (Datei geöffnet/gespeichert/neu geladen) leben im Frontend, nicht in Rust.**
   Rust loggt bei Datei-I/O (`read_text_file`, `write_text_file`, `stat_file`,
   `open_decoded_file`) bewusst nur Fehlschläge — sonst würde jede Datei-Operation doppelt im
   Log stehen (einmal Rust-Erfolg, einmal Frontend-Breadcrumb).
3. **Eine einzige Frontend-Logging-Brücke** (`apps/editor/src/logging.ts` → Tauri-Command
   `log_frontend`), fire-and-forget und selbst-fehlertolerant — künftige Features sollen sie
   trivial mitbenutzen können, statt eigene Logging-Pfade zu erfinden.
4. **`packages/core` bleibt frei von Logging-Code** (Invariante 3: React-frei UND headless
   testbar) — Logging ist Plattform-Glue, keine Domänenlogik, und lebt daher ausschließlich in
   `apps/editor`.

## Ausdrücklich NICHT geplant (damit es nicht versehentlich nachgebaut wird)

- XSD/DTD-Validierung.
- Bearbeiten von Dateien größer als der verfügbare RAM.
- Byte-identisches Round-Trip-Invariant mit Test-Suite (wie bei xdp-designer).

## 2026-07-21 — Grilling: sichere Entscheidung bei externen Dateiänderungen

1. **Der Reload-Dialog verlangt eine explizite Entscheidung.** Ein Klick auf den Overlay-Hintergrund
   wird ignoriert, weil der Klick zum Reaktivieren des Tauri-Fensters sonst bereits als „Meine
   Version behalten" gewertet werden kann. `Escape` bleibt als bewusste Tastaturabkürzung erhalten
   und entspricht „Meine Version behalten".
2. **Fokus und visuelle Primäraktion folgen dem aktuellen Dirty-Stand.** Ohne lokale Änderungen ist
   „Neu laden" fokussiert und primär; mit lokalen Änderungen „Meine Version behalten". Der Fokus
   bleibt zwischen beiden Aktionen eingeschlossen und kehrt nach dem Schließen zum zuvor aktiven
   Element zurück.
3. **Asynchrone Dateiprüfungen dürfen keine veraltete Entscheidung treffen.** Nach `stat_file` werden
   aktives Dokument und Dirty-Stand erneut aus dem aktuellen Zustand gelesen. Antworten für einen
   inzwischen inaktiven Tab werden verworfen; insbesondere darf ein nach Start der Prüfung dirty
   gewordenes Dokument niemals automatisch neu geladen werden. Dieselbe Bedingung wird nach dem
   asynchronen Einlesen nochmals unmittelbar vor dem Store-Austausch geprüft, damit auch Änderungen
   während `read_text_file` nicht verloren gehen.
4. **Externe Meldungen werden gebündelt und Dialoge nicht gestapelt.** Ist bereits ein anderer Dialog
   offen, bleibt der Reload-Hinweis vorgemerkt und erscheint erst danach. „Meine Version behalten"
   liest die Metadaten nochmals und quittiert den dann neuesten Plattenstand, ohne Baum, Quelltext,
   Dirty-Flag oder CommandBus zu verändern. Erst Änderungen nach dieser Quittierung werden erneut
   gemeldet.

## 2026-07-21 — Suchfokus und schwebende Meldungen

1. **`Strg+F` ist ein Fokus-Shortcut, kein Toggle.** Bei aktivem Dokument öffnet jeder Aufruf das
   Suchpanel beziehungsweise fokussiert das bereits vorhandene Suchfeld und markiert dessen Text.
   Der lokale Suchzustand bleibt erhalten. Normale Textfelder blockieren den Shortcut nicht;
   modale Dialoge haben Vorrang und werden nicht übergangen.
2. **Kurzlebige Rückmeldungen liegen außerhalb des Layoutflusses.** Fehler und Status werden als
   fester, oben mittig positionierter Toast-Stapel dargestellt, damit Ein-/Ausblenden weder Editor-
   Geometrie noch Mausbezug verändert. Neuere Meldungen stehen oben; beide Kanäle können gleichzeitig
   sichtbar sein.
3. **Zeitverhalten ist fest und vorhersehbar.** Statusmeldungen schließen nach 4 Sekunden, Fehler
   nach 8 Sekunden. Hover oder Tastaturfokus pausiert exakt die Restlaufzeit, `×` schließt sofort. Identische neue
   Meldungen sind neue Ereignisse und starten den Timer erneut. Dauer und Position sind bewusst
   keine Einstellungen.

## 2026-07-22 — Grilling: sichtbare Kennzeichnung ungespeicherter Änderungen

Auslöser: PO-Wunsch, ungespeicherte Änderungen sichtbar zu machen — primär am Tab, sekundär
(optional) am einzelnen Baumknoten. Im Grilling geklärte Grundsatzentscheidungen (Glossar siehe
`CONTEXT.md`):

1. **Tab-Kennzeichnung: Punkt statt Schließen-Icon (VS-Code-Stil), kein Sternchen/Rahmen.**
   Solange dirty, ersetzt ein kleiner Punkt das `×`; Hover zeigt trotzden `×` zum Schließen.
   Kompakt, kein zusätzlicher Platzbedarf, etabliertes Muster.
2. **`isDirty` bekommt eine echte Speicher-Baseline statt eines reinen „wurde je geändert"-Flags.**
   `CommandBus` merkt sich die Undo-Stack-Tiefe beim letzten Speichern (`markSaved()`); dirty =
   aktuelle Tiefe weicht von dieser Baseline ab. Undo bis exakt zum Speicherpunkt macht ein
   Dokument wieder sauber, auch ohne erneutes Speichern. Bewusste Einschränkung: das ist ein
   Tiefenvergleich, kein Content-Diff — nach Speichern und anschließendem Verzweigen der Historie
   (neuer Command löscht den Redo-Stack) könnte die Tiefe rein zufällig wieder mit der Baseline
   übereinstimmen, obwohl der Inhalt abweicht. Denselben Kompromiss akzeptieren die meisten Editor
   mit undo-basiertem Dirty-Tracking (u. a. VS Code); ein echter Content-Hash wäre teurer und für
   den Anwendungsfall nicht gerechtfertigt.
3. **Baum-Änderungsmarker sind ein optionales, standardmäßig AUSGESCHALTETES Setting** ("Baum" in
   den Einstellungen), rein additive Anzeige ohne Einfluss auf Modell/Speichern/Undo.
4. **Marker-Umfang: exakter Knoten UND zugeklappte Vorfahren, aber optisch unterschieden.** Der
   geänderte/neue Knoten selbst bekommt den vollen Punkt (Gelb=geändert, Grün… hier: `--accent`
   für neu, `--warn` für geändert, siehe Punkt 8); ein zugeklappter Vorfahre mit geändertem
   Nachfahren bekommt einen neutralen, blassen Punkt (`--text-2`), unabhängig davon, welche Art
   Änderung er enthält (keine Farbmischung bei mehreren Änderungsarten im selben Teilbaum).
5. **Gelöschte Knoten: Tombstone-Zeile an ursprünglicher Position, rein informativ.** Kein
   Klick-Verhalten (kein Teil-Undo-Mechanismus außerhalb des linearen CommandBus-Stacks) —
   Wiederherstellen nur über das normale Strg+Z. Ein gelöschter Teilbaum bekommt genau EINE
   Tombstone-Zeile für seine Wurzel, keine einzelnen Einträge für Nachfahren.
6. **Tombstone-Position ist an das Anker-Geschwister gebunden, nicht an einen festen Index.** Eine
   Tombstone-Zeile steht direkt hinter dem Geschwister, das vor dem gelöschten Knoten stand (bzw.
   an erster Stelle, falls kein solches Geschwister mehr existiert) — bleibt stabil, auch wenn
   andere Geschwister später verschoben werden.
7. **Skalierungs-Limit: ab 500 Änderungen in der Sitzung pausiert die Markierung** mit einem
   dezenten Hinweis, statt bei sehr großen Bearbeitungssitzungen die Baum-Performance zu
   gefährden.
8. **Marker-Farben nutzen die bestehenden Theme-Variablen (`--accent`, `--warn`, `--text-2`)
   statt einer neuen Farbe.** Das Projekt hat bewusst „einen einzigen Akzent" pro Theme (7
   Themes); eine neue Erfolgs-/Grün-Farbe hätte in jedem Theme einzeln abgestimmt werden müssen.
9. **Bekannte v1-Einschränkung, bewusst in Kauf genommen:** Wird das letzte reale Kind eines
   zugeklappten Knotens gelöscht, verschwindet dessen Twisty (reale Kinderzahl ist jetzt 0) und
   es gibt keine Möglichkeit mehr, ihn aufzuklappen, um die Tombstones zu sehen — außer er war
   zum Löschzeitpunkt bereits aufgeklappt. Behoben werden könnte das nur durch Anfassen der
   allgemeinen (nicht auf dieses Feature bezogenen) Auf-/Zuklapp-Logik in `App.tsx`, was für ein
   default-aus-Zusatzfeature nicht gerechtfertigt ist.

## 2026-07-24 — Byte-Offsets nach dem Speichern auffrischen

Auslöser: PO-Meldung über einen Kollegen — ein Feld ändern und speichern ging gut, ein zweites,
anderes Feld ändern und erneut speichern zerstörte die XML. Root Cause und Fix siehe
`docs/status.md` Nachtrag 2026-07-24. Die Grundsatzentscheidung dahinter:

1. **Nach jedem Speichern werden alle `byteRange`-Werte gegen den neu geschriebenen Text
   aufgefrischt, statt sie unangetastet zu lassen oder komplett zu verwerfen.** Minimal-invasives
   Speichern (Invariante #4) trägt einen bislang unausgesprochenen Vertrag: die `byteRange`-Werte
   im Baum müssen IMMER zu der `sourceText`, die gerade als Referenz dient, passen. Bis jetzt
   wurde nach dem Speichern nur `sourceText` ausgetauscht, ohne die Offsets nachzuziehen — der
   eigentliche Fehler.
2. **Alternative "alle `byteRange` nach jedem Speichern verwerfen" wurde verworfen.** Einfacher zu
   implementieren, aber jedes zweite Speichern in einer Sitzung hätte dann wie ein Full-Rebuild
   gewirkt — Kommentare/PIs in bis dahin unberührten Bereichen wären ab dem zweiten Speichern
   verloren gegangen, obwohl "best effort" laut Entscheidung #1 weiterhin so viel wie praktikabel
   erhalten soll.
3. **Alternative "kompletten Baum nach jedem Speichern neu parsen und Wurzel ersetzen" wurde
   verworfen.** Hätte Knotenidentität (`id`) und damit die Undo/Redo-Historie über den
   Speicherpunkt hinweg zerstört — im Widerspruch zur bestehenden Baseline-Semantik (`CONTEXT.md`
   "Baseline": Undo funktioniert über Speichervorgänge hinweg).
4. **Gewählt: reparse + positionsweise `byteRange`-Übertragung auf dieselben Knotenobjekte**
   (`syncByteRangesAfterSave`). Da der neu geparste Baum eine Serialisierung des bestehenden Baums
   ist, sind beide Bäume strukturell garantiert deckungsgleich — die Übertragung nach Position ist
   damit sicher, ohne Knotenidentität, `id`s oder Undo-Historie anzufassen.

## 2026-07-24 — Save-Epoche: byteRange-Invalidierung im CommandBus zentralisiert

Auslöser: PO-Meldung unmittelbar nach obigem Fix — Speichern → Strg+Z → erneut Speichern schrieb
weiterhin den geänderten statt des ursprünglichen Werts. Ursache: die 7 Mutations-Commands
(rename, set-value, set-attribute, insert-node, remove-node, move-node, rename-attribute)
erfassten/löschten/stellten `byteRange` jeweils selbst wieder her (`captureByteRanges`/
`clearByteRanges`/`restoreByteRanges`), ohne zu wissen, ob zwischen Erfassung und Undo gespeichert
wurde — eine vor einem Speichern erfasste `byteRange` ist danach ungültig (siehe Eintrag oben).
Gefunden und entworfen via `/improve-codebase-architecture` + `/grilling` (Glossar/Vokabular:
`/codebase-design` — Modul, Tiefe, Seam). Grundsatzentscheidungen:

1. **`Command` bekommt ein Pflichtfeld `byteRangeChain: DocNode[]`** (nicht optional): jeder
   Command-Typ muss explizit angeben, welche Kette betroffen ist — auch wenn die Antwort `[]`
   ist. Ein optionales Feld hätte genau die "vergisst man leicht"-Fragilität reproduziert, die
   dieser Umbau beheben soll.
2. **Erfassen/Löschen/Wiederherstellen wandert komplett aus den 7 Fabriken in den `CommandBus`**
   (statt die Fabriken um einen `doc`/Epoche-Parameter zu erweitern und an allen ~23
   Aufrufstellen in `App.tsx` durchzureichen). Die Fabriken deklarieren nur noch `byteRangeChain`;
   ihre `do()`/`undo()` enthalten nur noch die eigentliche Mutation. Locality: der Fix (und jeder
   künftige) sitzt an einer Stelle statt potenziell verstreut über jeden Aufrufer.
3. **Der Erfassungs-Schnappschuss (`{epoch, ranges}`) lebt in einer privaten
   `WeakMap<Command, Snapshot>` im `CommandBus`**, nicht als mutierbares Feld am Command-Objekt
   selbst — der Command bleibt eine schlanke, deklarative Beschreibung.
4. **`saveEpoch` ist ein privates Feld im `CommandBus`** (erhöht in `markSaved()`, neben
   `savedDepth`), nicht auf `JaxelDocument`: der `CommandBus` ist der einzige Konsument, analog zu
   `savedDepth`.
5. **Beim Undo wird die Kette IMMER zuerst gelöscht, erst danach ggf. wiederhergestellt** — nicht
   nur "restore überspringen bei Epochen-Mismatch". Grund: die vor dem Undo gültige `byteRange`
   gehörte zum ALTEN (jetzt durch Undo überschriebenen) Wert; sie ist so oder so falsch für den
   wiederhergestellten Wert, außer die Erfassung ist nachweislich noch gültig (Epoche passt).
6. **Coalescing (Live-Tippen, gleicher `coalesceKey`) übernimmt beim Verschmelzen den bereits
   vorhandenen Schnappschuss von der vorherigen Kette**, statt neu zu erfassen — die Erfassung
   gehört zur ganzen Tippkette (Zustand vor dem ERSTEN Tastendruck), nicht zum einzelnen Zeichen.
7. **`createCompositeCommand` bildet sein `byteRangeChain` automatisch als Vereinigung aller
   Sub-Commands** — sonst hätte ein Composite (z. B. "Alle ersetzen") nach diesem Umbau gar keine
   `byteRange`-Invalidierung mehr bekommen (echte Regression).

Im selben Arbeitspaket, als zweiter (kleinerer) Kandidat aus derselben Architektur-Review: die
Undo-Choreographie von "Alle ersetzen" saß in `App.tsx` (Invariante #3 verletzt, in
`packages/core` nicht testbar). Neue reine `planReplacements` (`search.ts`, berechnet
Vorher/Nachher ohne zu mutieren) + `createReplaceAllCommand` (`commands/replace-all.ts`, baut
daraus die Sub-Commands). Die alte mutierende `replaceAll()` entfällt ersatzlos.

## 2026-07-25 — Grilling: Mehrfachauswahl im Baum

Neun Punkte vor der Umsetzung mit dem PO festgelegt (Feature auf PO-Wunsch, zusammen mit
"Speichern unter" und der noch ausstehenden XML↔JSON-Konvertierung angestoßen).

1. **Eingabe: Strg+Klick togglet, Shift+Klick spannt einen Bereich, Shift+Pfeil hoch/runter
   erweitert zeilenweise.** Pfeiltasten OHNE Shift kollabieren die Auswahl auf den einen Knoten
   in Pfeilrichtung — kein getrennter Fokus-Rahmen neben der Auswahl (Windows-Explorer-Stil),
   weil das ein zweites, überall mitzuführendes Konzept wäre.
2. **Auswahl darf beliebig über Ebenen und Elternknoten hinweg gehen**, nicht nur Geschwister.
   Der PO wollte ausdrücklich die volle Flexibilität; der Preis ist die Index-Arithmetik für
   Cross-Parent-Verschieben (gelöst in `packages/core/src/commands/bulk.ts`).
3. **Bulk-fähig sind nur Löschen und Duplizieren** (dazu Kopieren und Drag&Drop, siehe 5/6).
   Umbenennen, Wert ändern, Kind/Geschwister anlegen sind bei mehr als einem ausgewählten Knoten
   deaktiviert — es gibt keinen eindeutigen Namen bzw. Elternknoten.
4. **Attribute-Panel zeigt bei Mehrfachauswahl nur "N Knoten ausgewählt"**, keine Schnittmenge
   gemeinsamer Attribute. Letzteres hätte Set-Attribute zu einer Composite-Aktion gemacht, für
   einen Nutzen, der sich erst im Gebrauch zeigen müsste.
5. **Drag&Drop nimmt die ganze Auswahl mit**, wenn ein markierter Knoten gezogen wird (relative
   Reihenfolge bleibt erhalten, ein Composite = ein Undo-Schritt); wird ein nicht markierter
   Knoten gezogen, kollabiert die Auswahl vorher auf diesen einen.
6. **Kopieren schreibt mehrere Fragmente hintereinander** (XML) bzw. als Properties eines
   Objekts (JSON, damit die Nutzlast gültiges JSON bleibt). Einfügen parst beides wieder als
   Liste — neue Funktionen `parseFragments`/`serializeFragments` in `packages/core`.
7. **Kontextmenü folgt der Datei-Explorer-Konvention:** Rechtsklick auf einen bereits markierten
   Knoten behält die Mehrfachauswahl, Rechtsklick auf einen anderen kollabiert auf diesen einen.
8. **Optik: alle markierten Zeilen bekommen dieselbe bestehende `.tree-row--selected`-Markierung**
   — kein Sonderstil für den zuletzt angeklickten Knoten, damit kein zweiter visueller Zustand
   über alle acht Themes hinweg abgestimmt werden muss.
9. **Jede Bulk-Aktion ist EIN Undo-Schritt** (`createCompositeCommand`, wie schon bei "Alle
   ersetzen") — folgt direkt aus der bestehenden Invariante "ein sichtbarer Nutzerschritt = ein
   Undo-Schritt".

Umsetzungsdetails, offene Punkte und die beim Bauen gefundenen Fallstricke (Anker/Lead,
Index-Verschiebung, `topmostRows`) stehen im zugehörigen `docs/status.md`-Nachtrag.

## 2026-07-25 — Grilling: XML/JSON-Konvertierung

Drittes und letztes der drei vom PO benannten Features. Die Attributfrage war schon vorab
geklärt (Attribute werden als `@`-Properties mitgeschrieben); die restlichen Punkte wurden vor
der Umsetzung entschieden:

1. **Die Konvertierung hängt an "Speichern unter", nicht an einem eigenen Menüpunkt.** Wählt man
   im Dateidialog die Endung des jeweils anderen Formats, wird konvertiert geschrieben. Der PO
   hat sich bewusst gegen die Alternative "Extras → Konvertieren, Ergebnis als neues Tab"
   entschieden — ein Weg statt zwei.
2. **Element mit Attributen UND Textinhalt: der Text landet in einer `#text`-Property.**
   `<preis waehrung="EUR">19.99</preis>` → `{"preis": {"@waehrung": "EUR", "#text": "19.99"}}`.
   Verbreitete Konvention (DOM, fast-xml-parser) und verlustfrei rückkonvertierbar. Ein Element
   ohne Attribute bleibt ein schlichtes Primitiv (`{"preis": "19.99"}`), damit der Normalfall
   nicht unnötig aufgebläht wird. Beide Präfixe (`@`, `#`) sind kollisionsfrei, weil sie keine
   gültigen XML-Namenszeichen sind.
3. **JSON-Schlüssel, die keine XML-Namen sein können, brechen die Konvertierung ab** — mit einer
   Fehlermeldung, die den Schlüssel und seinen Pfad nennt, und ohne dass eine Datei entsteht.
   Automatisches Bereinigen (`"1. Quartal"` → `_1._Quartal`) wurde verworfen: das erzeugt eine
   Datei, die korrekt aussieht und es nicht ist. Einzige Ausnahme ist der von `json-import`
   *erfundene* Name `$root` (bei Wurzel-Array, -Primitiv oder Mehrschlüssel-Objekt) — der wird
   zu `root`, weil ihn nicht der Nutzer gewählt hat.
4. **Vor der Konvertierung fragt ein Dialog nach** und benennt konkret, was verloren geht
   (XML→JSON: Kommentare/CDATA-Markierungen; JSON→XML: Zahlen- und Boolean-Typen; beide
   Richtungen: die Rückgängig-Historie). Grund: die Endung im Dateidialog verstellt man leicht
   versehentlich, und die Konvertierung ist kein reines Speichern — sie ersetzt den Baum.
5. **Die Konvertierung erzeugt Text und parst ihn neu, statt einen Zielbaum direkt zu bauen.**
   Damit bleiben `xml-import`/`json-import` die einzige Instanz, die weiß, wie ein Baum des
   jeweiligen Formats aussieht; ein direkt gebauter Baum wäre eine zweite, still auseinander-
   driftende Umsetzung derselben Mapping-Regeln.

Umsetzungsdetails und die beim Bauen gefundenen Fallstricke stehen im zugehörigen
`docs/status.md`-Nachtrag.

## 2026-07-25 — Grilling: Kommentare in XML (anzeigen, aus-/einkommentieren)

Design vollständig geklärt, Umsetzung bewusst in zwei Schritte geteilt (siehe Punkt 9). Begriffe
dazu stehen in `CONTEXT.md` (Kommentarknoten, Auskommentierter Teilbaum, Prolog/Epilog).

**Befund, der die Runde ausgelöst hat:** Eine XML-Datei nur zu öffnen und zu speichern verliert
schon in 0.5.0 den DOCTYPE und alle Kommentare vor der Wurzel — `skipMisc` in `xml-import.ts`
überspringt sie, und `serializeXmlMinimal` stellt nur die XML-Deklaration wieder voran. Derselbe
Fehlertyp wie der in 0.3.2 behobene Verlust der XML-Deklaration, nur eine Ebene weiter.

1. **Kommentare werden echte Knoten in `children`** — `DocNode` bekommt einen Diskriminator
   (`kind: "element" | "comment"`). Die Alternativen (separate Liste am Elternknoten mit
   Anker-Logik, oder rein visuell aus dem Quelltext) wurden verworfen: Auskommentieren ist damit
   ein Ersetzen an Ort und Stelle, und die bestehenden Insert/Remove/Move-Commands greifen
   unverändert. Preis: die ~50 Stellen, die `.children` iterieren, müssen je entscheiden, ob sie
   Kommentare mitnehmen oder überspringen.
2. **Ein auskommentierter Teilbaum bleibt aufklappbar, aber schreibgeschützt.** Nicht nur eine
   Textzeile (man sähe nicht mehr, was stillgelegt wurde) und nicht voll bearbeitbar (jede
   Änderung erzwänge eine Reserialisierung des Kommentartexts, und alle Mutations-Commands
   müssten den Sonderfall "Knoten liegt in einem Kommentar" kennen). Ob ein Kommentar einer ist,
   entscheidet der Parse-Versuch beim Laden — keine Markierung in der Datei.
3. **Prolog und Epilog werden wörtlich bewahrt** und beim Speichern unverändert wieder
   vorangestellt bzw. angehängt; Kommentare darin erscheinen als schreibgeschützte Zeilen über
   bzw. unter der Wurzel. Ein synthetischer Dokumentknoten über der Wurzel wurde verworfen — die
   Wurzel ist an zu vielen Stellen als "der eine Knoten" verdrahtet (Fokus-Tabs, Pfade,
   `findSiblingSlot`, Serialisierung).
4. **Lässt sich ein Knoten nicht einwickeln, ist die Aktion ausgegraut** — mit Begründung im
   Tooltip. Betroffen ist jeder Teilbaum, der einen Kommentar oder ein `--` enthält, denn XML
   erlaubt keine verschachtelten Kommentare und kein `--` darin. Escaping scheidet aus (in
   Kommentaren löst XML keine Entities auf). Innere Kommentare stillschweigend zu entfernen wäre
   ein Verlust, der erst beim Einkommentieren auffällt; eine Jaxel-eigene Ersatzschreibweise
   würde eine Datei erzeugen, die nur Jaxel korrekt zurückliest.
5. **Kommentare sind vollwertige Knoten**: löschen, Text ändern (mit `--`-Prüfung), verschieben,
   duplizieren, und "Kommentar einfügen" (davor / danach / als Kind) im Kontextmenü.
   Löschen/Verschieben/Duplizieren fallen ohnehin ab, weil die Commands auf Indizes arbeiten.
6. **Suche findet Prosa-Kommentare UND auskommentierte Teilbäume; ersetzt wird nur, was auch von
   Hand editierbar ist.** "Alle ersetzen" meldet hinterher, wie viele Treffer wegen
   Auskommentierung übersprungen wurden — still übergehen wäre die schlechtere Variante.
7. **Bulk-Auskommentieren wickelt jeden Knoten einzeln ein** (ein Composite = ein Undo-Schritt).
   Funktioniert damit auch für die verstreuten Auswahlen, die die Mehrfachauswahl erlaubt, und
   Einkommentieren bleibt pro Knoten symmetrisch.
8. **Eigene Optik statt Wiederverwendung der Tombstone-Darstellung.** Neue CSS-Variable
   `--comment` (in allen acht Themes), Kursivschrift und ein `<!--`-Zeilenmarker; auskommentierte
   Teilbäume zusätzlich mit linkem Randstreifen, der die Reichweite zeigt. Der PO hat die
   ursprüngliche Annahme "bestehende Mittel wiederverwenden" ausdrücklich korrigiert: Tombstones
   sind `--text-2` + durchgestrichen, ein Kommentar in derselben Farbe wäre nicht unterscheidbar.
9. **Zuschnitt: erst der Bugfix, dann das Feature.** Schritt 1 ist allein "Prolog und Epilog
   wörtlich bewahren" — klein, risikoarm, sofort als 0.5.1 auslieferbar, weil der Datenverlust in
   einer veröffentlichten Version steckt. Schritt 2 ist das Kommentar-Feature als eigenes Paket.

**Angenommen (nicht ausdrücklich entschieden):** Kommentare heißen im Pfad `#comment`
(`catalog.#comment[0]`) — dieselbe DOM-Konvention wie das bereits beschlossene `#text` der
JSON-Konvertierung, womit die Index-Logik in `path.ts` unverändert greift.

**Nebeneffekt, der für Punkt 1 spricht:** Heute überleben Kommentare *zwischen* Geschwistern nur,
solange der Elternknoten seinen `byteRange` behält (siehe Kommentar in `xml-export.ts`) — ändert
man ein Kind, sind sie weg. Sind Kommentare eigene Knoten, gibt es diese Lücken nicht mehr.

## 2026-07-26 — Testebenen: Node für Logik, echter Browser für UI

1. **jsdom ist ersatzlos entfallen.** UI-Tests laufen in headless Chromium (`@vitest/browser` +
   Playwright). Begründung: jsdom kennt weder CSS noch Layout noch `ResizeObserver` — genau die
   drei Dinge, an denen Darstellungsfehler hängen. Der Umstieg deckte sofort auf, dass drei
   Drag&Drop-Tests gegen einen `getBoundingClientRect`-Mock prüften und der Drag-Ghost-Code nie
   ausgeführt wurde.
2. **Die Projektgrenze ist die Dateiendung**, nicht eine Testliste: `*.test.ts` = React-freie
   Logik in Node, `*.test.tsx` = UI im Browser. Das ist dieselbe Trennung, die CLAUDE.md ohnehin
   für den Produktionscode vorschreibt, und braucht deshalb keine eigene Pflege.
3. **Referenzbilder laufen getrennt** (`npm run test:visual`, Projekt `visual`) und **nicht** in
   der CI. Schriftrendering hängt an den installierten Fonts des Rechners; ein hier erzeugtes
   Bild würde auf einem Runner abweichen, ohne dass sich am Programm etwas geändert hat. Der
   maschinelle Regressionsschutz für Optik kommt stattdessen aus gemessenen Farbwerten
   (`theme-colors.test.tsx`) — die sind plattformunabhängig und laufen in der CI mit.
4. **Farbzusicherungen werden gegen einen absichtlichen Defekt gegengeprüft**, bevor sie als
   erledigt gelten. Ein Test, der nicht rot werden kann, sichert nichts zu; die erste Fassung von
   `theme-colors.test.tsx` maß gegen einen transparenten Hintergrund und hätte jede Farbe
   durchgewinkt.
5. **Keine WebDriver-/Tauri-E2E-Tests.** Native Dateidialoge sind per WebDriver nicht steuerbar —
   also genau die Stellen, an denen Fehler säßen —, unter macOS gibt es keinen Treiber, und die
   CI bräuchte `xvfb`. Für die Rust-Seite sind schlichte `#[test]` plus `cargo test` das bessere
   Werkzeug. (Ergänzt die Liste "ausdrücklich NICHT geplant".)
## 2026-09-01 — Grilling: Tab-Aktivierung, Tab-Kontextmenü und Tab-Reordering

Beim Öffnen einer Datei wird der neue oder bereits vorhandene Vollansichts-Tab sofort aktiv;
ein erneutes Öffnen erzeugt keinen Duplikat-Tab. Tabs können per Drag & Drop mit transparentem
Ghost verschoben werden. Ein normaler Klick aktiviert, das Ziehen selbst aktiviert nicht.
Die Reihenfolge und der aktive Vollansichts-Tab werden in der Sitzungswiederherstellung erhalten.

Der Rechtsklick bezieht sich auf den angeklickten Tab, ohne ihn zu aktivieren. Das Kontextmenü
enthält „Tab schließen“, „Alle Tabs schließen“, „Alle anderen Tabs schließen“, „Tabs rechts
schließen“, „Tabs links schließen“, „Dateipfad kopieren“ und „Übergeordneten Ordner öffnen“.
Bereichsaktionen erhalten die Reihenfolge der übrigen Tabs und schließen Fokus-Tabs mit ein.
Nicht mögliche Einträge bleiben deaktiviert. Ungespeicherte Dokumente werden vor dem Entladen
berücksichtigt; ein Abbruch stoppt die laufende Mehrfachaktion.

„Dateipfad kopieren“ kopiert den absoluten nativen Pfad ohne `file://`; bei unbenannten Tabs ist
die Aktion deaktiviert. Der Parent-Ordner wird über das Betriebssystem geöffnet, soweit möglich
mit Markierung der Datei. Fokus-Tabs verwenden dabei den Pfad des zugrunde liegenden Dokuments.

Im Bearbeitungsmodus wächst das Inhaltsfeld über die gesamte verfügbare Inhalts-Spalte, bleibt
einzeilig horizontal erreichbar und behält Enter zum Bestätigen sowie Escape zum Verwerfen.

## 2026-09-02 — Grilling: Tab-Leiste bei Überlauf

Der native horizontale Scrollbalken wird nicht mehr über der Tab-Leiste angezeigt. Ein separater
Scrollcontainer erhält bei Überlauf linke und rechte Navigationsbuttons, die jeweils ungefähr eine
sichtbare Tab-Breite direkt scrollen. Die Buttons sind am jeweiligen Rand deaktiviert; Mausrad und
`Shift`+Mausrad bewegen die Tabs ebenfalls horizontal. Während eines Tab-Drag&Drop scrollt der
Bereich automatisch, wenn der Zeiger nahe an einem Rand liegt.

Tabs verwenden eine flexible Breite zwischen 128 und 240 px, lange Namen werden mit Ellipse
gekürzt. Der vollständige Name bleibt über Tooltip und Übersicht erreichbar. Die Übersicht ist
ab zwei Tabs verfügbar, enthält Suche, Pfad, Änderungsstatus und Einzel-Schließen, schließt bei
Außenklick oder `Escape` und ist über `Strg+P` erreichbar. `Strg+Tab` und `Strg+Shift+Tab` wechseln
zum nächsten bzw. vorherigen Tab; Eingabefelder behalten ihre normale Tastaturbedienung.

Diese Entscheidung ersetzt für die Tab-Leiste die frühere Einzeilen-Annahme; die sichtbare
Wertevorschau und der Werte-Editor bleiben entsprechend der späteren Lesbarkeitsentscheidung
mehrzeilig.

## 2026-09-01 — Grilling: Lesbarkeit und ausblendbares Attribute-Panel

Textwerte in der Baumansicht dürfen die feste Ein-Zeilen-Darstellung überschreiten. Die
Virtualisierung verwendet deshalb gemessene variable Zeilenhöhen; Text wird innerhalb der
verfügbaren Breite umgebrochen und auf maximal vier sichtbare Zeilen begrenzt. Eine Auslassung
kennzeichnet längere Inhalte, der Tooltip enthält weiterhin den vollständigen Wert. Der
Schätzwert für nicht gemessene Zeilen bleibt 22 px, um die Darstellung großer Dateien performant
zu halten.

Die Schriftgröße für Baum, Inline-Editor und Attributwerte ist als persistente Einstellung im
Bereich 10–20 px verfügbar, Standardwert 12 px. Das Attribute-Panel ist über die Toolbar und
`Strg+Alt+A` ein-/ausblendbar. Beim Ausblenden übernimmt der Baum den freigewordenen Platz;
eine rechts angedockte Suche bleibt unabhängig erreichbar.

Attribute in einer Baumzeile sind ebenfalls flexible, umbrechbare Inhalte. Sie dürfen den
Elementwert nicht durch eine intrinsische Einzeilenbreite verdrängen; Attribute und Wert teilen
sich den verfügbaren Platz und werden jeweils auf maximal vier Zeilen begrenzt.

## 2026-09-02 — Grilling: Fensteraktivierung bei Dateiübergabe

Wenn Jaxel über eine Dateiverknüpfung gestartet wird oder eine laufende Instanz einen neuen
Dateiübergabe-Auftrag erhält, wird das Hauptfenster bei mindestens einem gültigen Pfad explizit
sichtbar gemacht, entminimiert und fokussiert. Falls der Window Manager den Fokus nicht sofort
bestätigt, wird plattformabhängig eine nicht-invasive Aufmerksamkeit-Anforderung ausgelöst.
Always-on-top wird nicht verwendet; Größe und Position des Fensters bleiben unverändert.

Ungültige oder nicht mehr existierende Pfade lösen keine zusätzliche Aktivierung aus. Mehrere
gültige Pfade bleiben in der bestehenden Queue und werden weiterhin als einzelne Tabs geöffnet.

## 2026-09-14 — Grilling: Optionaler VS-Code-Host

Jaxel bleibt eine eigenständige Tauri-Anwendung und erhält zusätzlich eine Host-Abstraktion für
die Einbettung seiner React-Oberfläche als VS-Code-WebView. Die Extension liefert genau eine
Datei an einen Jaxel-Tab pro VS-Code-Fenster; Jaxel übernimmt dort weder automatische
Dateizuordnungen, die eigene Tab-Leiste oder Dateidialoge. Menüleiste und Toolbar bleiben als
Bedienoberfläche sichtbar. Die Entscheidung, welche XML-/JSON-Dateien den optionalen Custom-Editor
verwenden, bleibt bei VS Code.

Im Embedded-Modus besitzt VS Code die Wahrheit über Datei-I/O, Speichern, Backup und Dirty-State.
Nach jedem Host-Save bestätigt der Host den gespeicherten Text einschließlich Dateistatistik;
Jaxel aktualisiert vor dem nächsten minimal-invasiven XML-Save seine Bytebereiche und
Änderungs-Baseline. Standalone behält die bisherige Tauri-Dateiverwaltung.

Base64-PDFs werden abhängig vom Host behandelt: Standalone dekodiert sie in eine temporäre Datei
und öffnet das Betriebssystem-Standardprogramm; im VS-Code-Modus sendet Jaxel nur die Bytes an den
Host, der sie über den vorhandenen PDF-Provider der Extension öffnet.

Die Extension baut beim Extension-Build das Frontend aus dem Quellarchiv des aktuellen Commits im
Standardbranch des öffentlichen GitHub-Repositories selbst und kopiert ausschließlich die erzeugte
`dist`-Ausgabe. Die SHA-256-Prüfsumme des Quellarchivs wird als Build-Identität abgelegt. Ein lokales Fallback-Bundle
ist ausgeschlossen, damit keine veraltete oder vertrauliche Jaxel-Kopie eingebettet wird; das
Jaxel-Release muss deshalb kein separates WebView-Asset veröffentlichen.

## 2026-09-11 — Grilling: Live-Suche ab drei Zeichen

Die Suche aktualisiert ihre Trefferliste automatisch, sobald der Suchbegriff mindestens drei
Zeichen lang ist. Das gilt für Tippen, Einfügen aus der Zwischenablage, Ausschneiden und Löschen;
eine kurze Verzögerung bündelt schnelle Eingaben. Unter drei Zeichen werden Trefferliste und
aktiver Suchfilter geleert.

Änderungen an Suchbereich, Groß-/Kleinschreibung, Regex und Unterbaum-Scope starten ebenfalls
automatisch eine neue Suche. Änderungen am Dokument durch Bearbeiten, Einfügen, Löschen oder
Undo/Redo aktualisieren eine aktive Suche erneut, damit Treffer immer dem geparsten Baum
entsprechen.

Die Live-Suche markiert den ersten Treffer, verschiebt den Baum aber nicht. Pfeiltasten bewegen
nur die Markierung; Enter bestätigt den markierten Treffer und navigiert im Baum. Gibt ein
Regex-Eintrag vorübergehend einen Fehler, bleiben die letzten gültigen Treffer sichtbar und die
Fehlermeldung wird angezeigt.

## 2026-09-02 — Korrekturen nach Release 0.7.0

Die beim Start bzw. durch „Öffnen mit“ übergebenen Pfade warten auf den Abschluss der
Sitzungswiederherstellung und werden danach in Queue-Reihenfolge sequenziell geöffnet. Dadurch
hat die angeforderte Datei Vorrang vor dem gespeicherten aktiven Tab und parallele Ladevorgänge
können den Fokus nicht mehr in unbestimmter Reihenfolge überschreiben. Das Tab-Schließen-`x`
wird über Flexbox an den rechten Rand des Tabs gesetzt; der Dateiname nutzt den verbleibenden
Platz und wird weiterhin per Ellipse gekürzt.

## 2026-09-14 — `.ext`-Dateien als XML-/JSON-Quellen

`.ext`-Dateien werden als mögliche XML-/JSON-Quellen behandelt, weil ReportWriter-SourceCopies
typischerweise diese Endung verwenden. Die Endung allein legt das Format nicht fest: Jaxel nutzt
bei `.ext` weiterhin die vorhandene Inhaltsheuristik (XML bei führendem `<`, sonst JSON). In der
VS-Code-Extension bleibt Jaxel für `.ext` nur eine optionale Editorwahl; standalone wird die Endung
zusätzlich im Öffnen-Dialog und in der Tauri-Dateizuordnung angeboten.

## 2026-09-14 — Grilling: Kollegenfeedback zu Logdatei, Verlauf, Base64 und Baumaktionen

Vier Rückmeldungen wurden mit dem PO geschärft und als Anforderungen bestätigt:

1. **Logdatei öffnen (Windows, portable Tauri-App):** Der Menüpunkt soll die vorhandene
   Logdatei direkt mit dem Standardprogramm öffnen. Falls sie noch nicht existiert, öffnet Jaxel
   den Logordner; falls das Betriebssystem das Öffnen ablehnt, zeigt Jaxel den Fehler zusammen
   mit dem Zielpfad sichtbar an. Der konkrete Fehlerfall der portablen Windows-Version bleibt
   bis zu einer reproduzierbaren Ausführung ein offener Debugpunkt.
2. **Zuletzt geöffnete Dateien:** Eine Einstellung steuert die Anzahl im Bereich `0–50`, mit
   Standardwert `8`. Beim Wert `0` wird die gespeicherte Liste sofort geleert und ausgeblendet;
   beim Verringern werden die ältesten Einträge unmittelbar abgeschnitten. Eine eigene
   Löschaktion ist damit nicht erforderlich.
3. **Base64-Benennung:** Der deutsche UI-Schlüssel wird von „Als Base64 dekodieren“ zu
   „Base64 dekodieren“ verkürzt. Kontextmenü, Badge-Titel und Dokumentation verwenden dieselbe
   Benennung; die Funktion und die englische Übersetzung bleiben unverändert.
4. **Baumweite Auf-/Zuklapp-Aktion:** Im Menü „Ansicht“ kommen „Alles aufklappen“ und
   „Alles zuklappen“ hinzu. Die Aktion gilt im Vollansicht-Tab für die Dokumentwurzel und in
   einer Fokusansicht für den fokussierten Unterbaum. Beim Zuklappen bleibt die jeweilige Wurzel
   sichtbar. Die zunächst feste Spooler-Belegung lautet NumPad `*` zum Aufklappen und NumPad `/`
   zum Zuklappen; eine spätere freie Umbelegung ist ein separates Arbeitspaket.

Die Punkte beschreiben den bestätigten Produktscope; ihre Implementierung und die zugehörigen
Tests stehen noch aus.

## 2026-09-14 — Umsetzung des Kollegenfeedbacks

Die vier bestätigten Punkte sind umgesetzt: Die Verlaufslänge ist in den Einstellungen zwischen
0 und 50 steuerbar (Standard 8), wobei 0 die Liste leert; der deutsche Base64-Schlüssel lautet
„Base64 dekodieren“. Der Baum unterstützt im aktuellen Sichtbereich „Alles aufklappen“ und
„Alles zuklappen“ über das Ansichtsmenü sowie NumPad `*` und NumPad `/`. `open_log` berücksichtigt
die möglichen Schreibweisen der Logdatei, damit portable Windows-Installationen nicht wegen einer
abweichenden Groß-/Kleinschreibung auf den falschen Zielpfad fallen.

## 2026-09-24 — Baumaktionen: Erlaubnis und Command-Bau im Core

Gefunden per Architektur-Review (`improve-codebase-architecture`, Kandidat „Schreibschutz für
auskommentierte Teilbäume in den Core holen“). Der Schreibschutz des auskommentierten Teilbaums
war nur im UI durchgesetzt, verteilt über sieben Prüfungen in `App.tsx`; Einfügen (`Strg+V`) und
„Kind anlegen“ unter einem Kommentar hatten keine Prüfung, die eingefügten Knoten wären beim
nächsten Speichern verloren gegangen (Tests belegen beides).

1. **Ein Modul, zwei Fragen:** `packages/core/src/commands/tree-actions.ts` beantwortet für jede
   Baumaktion, ob sie auf diesen Zeilen erlaubt ist (`treeActionBlocker`, billig genug für jeden
   Menü-Render) und welcher Command samt Folgeauswahl/Aufklappen/Editor sie ausführt
   (`planTreeAction`). `App.tsx` führt nur noch den Plan aus. Vorbild ist
   `planReplacements`/`createReplaceAllCommand` (Save-Epoche-Eintrag).
2. **Menüzustand und Ausführung fragen dieselbe Stelle.** Vorher prüften Menüleiste,
   Kontextmenü und Handler unterschiedlich (Menüleiste: nur „etwas ausgewählt“), genau daraus
   entstanden die Lücken.
3. **Regel:** Nichts innerhalb eines Kommentars wird geändert, und ein Kommentar bekommt keine
   Kinder. Der Kommentarknoten selbst bleibt editierbar (Text) und darf Geschwister bekommen.
4. **Verschieben wird strenger:** Bisher prüfte das Ziehen nur die gezogene Zeile; lag ein
   Kommentar oder ein Knoten aus einem Kommentar zusätzlich in der Mehrfachauswahl, wurde er
   mitverschoben. Jetzt blockiert jede solche Zeile in der Auswahl. Für Knoten *aus* einem
   Kommentar war das ein Datenfehler (der Kommentartext hätte ihn beim Speichern
   wiederhergestellt, also verdoppelt).

## 2026-09-24 — Workspace: Dokument- und Tab-Verwaltung ohne React

Gefunden per Architektur-Review (Kandidat „Workspace aus dem React-Hook lösen“). Die
meistgeänderte Zustandslogik (`useJaxelDocuments`, 16 Commits seit Juli) war ein React-Hook ohne
eigene Tests; erreichbar nur über `App.test.tsx` im Browser mit gemockten Tauri-Modulen.

1. **`Workspace` (`apps/editor/src/state/workspace.ts`) ist eine React-freie Klasse** mit
   unveränderlichen Snapshots (`getSnapshot`/`subscribe`). `useJaxelDocuments` ist nur noch der
   `useSyncExternalStore`-Adapter und behält seine bisherige Rückgabe — `App.tsx` blieb dadurch
   unverändert.
2. **Ort `apps/editor`, nicht `packages/core`:** Tabs, Fokus-Tabs und „Unbenannt-N“ sind
   Editor-Zustand, kein Dokumentmodell. Wie `tree/selection.ts` ist es reines TypeScript und läuft
   im Node-Projekt `logic` (Dateiendung `*.test.ts`, Entscheidung vom 26.07.).
3. **Seam zum Host: `WorkspaceHost = Pick<JaxelHost, "readTextFile" | "writeTextFile" | "log">`.**
   Zwei Adapter: der echte Host (Tauri/VS Code) und `InMemoryHost` in `workspace.test.ts`.
4. **Ein Speicherabschluss für alle Wege:** eigenes Speichern, „Speichern unter“ und die
   Bestätigung einer VS-Code-Speicherung laufen durch dieselbe Methode `commitSaved`
   (Byte-Offsets abgleichen → `markSaved` → Änderungsmarker-Baseline). Vorher existierte die
   Reihenfolge doppelt (`persistSaved`, `acknowledgeSaved`).
5. **`isDirty` bleibt ein Feld am Dokument-Snapshot, wird aber nur noch abgeleitet**
   (`commandBus.isDirty()` bei jedem Command und nach jedem Speichern), nie unabhängig gesetzt.
6. **CommandBus-Abos sind nach CommandBus geschlüsselt statt nach Dateipfad** — „Speichern unter“
   muss dadurch keine Abo-Tabelle mehr umschlüsseln.

## 2026-09-24 — Kommentare verschiebbar, Attribute im Kommentar schreibgeschützt

PO-Entscheidung auf die zwei offenen Punkte aus „Baumaktionen im Core“:

1. **Kommentarknoten sind per Drag&Drop verschiebbar** (wie in CONTEXT.md „Kommentarknoten“
   beschrieben), als Ganzes samt eines auskommentierten Teilbaums. Weiterhin gesperrt: Zeilen
   *innerhalb* eines Kommentars ziehen, und irgendetwas in einen Kommentar hinein oder neben eine
   Zeile im Kommentar ablegen. Die Zielregel steht einmal im Core (`moveTargetBlocker`) und wird
   auch von der Drop-Anzeige (`tree/dnd.ts`) benutzt, damit beim Ziehen keine Ablage angezeigt
   wird, die danach abgelehnt würde. Das ersetzt Punkt 4 des Eintrags „Baumaktionen“, soweit er
   Kommentarknoten selbst betraf.
2. **Das Attribute-Panel ist für Knoten im Kommentar schreibgeschützt** (Felder `readOnly`, kein
   Entfernen, keine neue Zeile, Hinweistext) statt Eingaben stillschweigend zu verwerfen. Die
   Entscheidung kommt aus derselben Core-Regel (`set-attribute`); am Kommentarknoten selbst sind
   Umbenennen und Attribute ebenfalls gesperrt, weil ein Kommentar nur seinen Text speichert.

## 2026-09-25 — App-Aktionen: eine Tabelle für alle Einstiege

Gefunden per zweitem Architektur-Review (Kandidat „Eine Aktionstabelle“). Beschriftung,
Tastenkürzel-Hinweis und Aktiv-Regel jeder Aktion standen je Einstieg (Tastatur, Menüleiste,
Kontextmenü, Toolbar) separat in `App.tsx` und waren auseinandergelaufen: „Suchen“ in Menü und
Toolbar wirkte bei rechts angedockter Suche nicht, „Knoten kopieren“ war in der Menüleiste bei
Mehrfachauswahl ausgegraut, obwohl `Strg+C` mehrere Knoten kopiert.

1. **`apps/editor/src/actions.ts` ist die einzige Quelle** für Beschriftung, Kürzel-Hinweis und
   Aktiv-Regel. Die Regeln lesen nur Werte (`ActionContext`), sind also in Node testbar; für
   Baumaktionen fragen sie die Core-Regel (`treeActionBlocker`).
2. **Was eine Aktion tut, bleibt in `App.tsx` (`runAction`)**, weil sie React-Zustand schreibt.
   `runAction` prüft die Aktiv-Regel selbst, damit Tastatur und Menü nie verschieden entscheiden.
3. **Nur Aktionen mit mehr als einem Einstieg stehen in der Tabelle.** Pfeiltasten, F2,
   „Logdatei öffnen“ und „Über“ haben nichts, das auseinanderlaufen könnte.
4. **`Strg+F` bleibt ein Fokus-Shortcut** (Eintrag 2026-07-21): Er öffnet immer und setzt den
   Fokus; Toolbar und Menü schalten die Suche dagegen um — unten ein/aus, im Rechts-Dock zwischen
   Suchen- und Eigenschaften-Tab. Beide teilen sich Beschriftung, Kürzel und Aktiv-Regel.
5. **`Strg+O`/`Strg+N` werden nur beansprucht, solange die Aktion aktiv ist** — im VS-Code-Modus
   bleiben sie Tastenkürzel von VS Code (Verhalten unverändert).

## 2026-09-25 — Schließen-Plan im Workspace

Aus dem dritten Architektur-Review (nur Strong). `closeTabSet` rief pro Tab `handleCloseTab`
auf, das gegen die Tab-Liste des aktuellen Renders prüfte, ob ein anderer Tab das Dokument
offen hält. Beim gemeinsamen Schließen von Vollansicht und Fokus-Tab eines geänderten Dokuments
hielt jeder Schritt den jeweils anderen Tab für offen — beide schlossen ohne Nachfrage, die
Änderungen waren weg (per Test belegt).

1. **`Workspace.planClose(keys)` entscheidet für die ganze Menge auf einmal** gegen den aktuellen
   Snapshot, welche Dokumente entladen würden und welche davon ungespeichert sind. Das
   Einzel-Schließen läuft über denselben Weg.
2. **Ein Dialog für alle betroffenen Dokumente**; vorher brach die Schleife beim ersten
   geänderten Dokument ab und verwarf den Rest der Auswahl. Abbrechen einer Speichern-unter-Abfrage
   lässt alle Tabs offen.
3. **Die schließenden Tabs merkt sich der Dialog als Dokument + Fokus, nicht als Schlüssel**, weil
   Speichern eines unbenannten Dokuments dessen Pfad und damit jeden Schlüssel ändert.

## 2026-09-25 — Nichts läuft hinter einem Dialog

Aus dem dritten Architektur-Review (nur Strong). Offene Dialoge wurden über eine von Hand
gepflegte Oder-Kette erkannt, in der der Konvertieren-Dialog fehlte, und nur `Strg+F` fragte
sie ab. `Strg+S` hinter der Neu-laden-Frage schrieb die Datei und überschrieb die externe
Version ohne die ausdrückliche Entscheidung aus dem Eintrag vom 21.07. (per Test belegt).

1. **`visibleDialog` in `App.tsx` ist die eine Stelle, die alle Dialogzustände kennt** und sagt,
   welcher Dialog gerade sichtbar ist. Die Neu-laden-Frage steht darin zuletzt, weil sie
   vorgemerkt wartet, bis kein anderer Dialog offen ist. Ein neuer Dialog muss nur hier
   eingetragen werden.
2. **Die Aktionstabelle kennt `modalOpen`** und sperrt dann jede App-Aktion, egal über welchen
   Einstieg. Die Tastatur verwirft hinter einem Dialog alle Kürzel, auch die Baum-Navigation.
3. **Getrennte Zustände je Dialog bleiben** statt eines einzigen Zustandswerts: Die
   Neu-laden-Frage muss neben einem anderen Dialog vorgemerkt existieren können.

## 2026-09-25 — Stabile Tab-Identität für den Ansichtszustand

Aus dem dritten Architektur-Review (nur Strong). Die gemerkte Ansicht je Tab (aufgeklappte
Knoten) hing am Tab-Schlüssel, den der Workspace bei „Speichern unter“, Konvertieren und beim
Neuladen eines Fokus-Tabs ändert. `App.tsx` hielt jede Schlüsseländerung für einen Tab-Wechsel:
Nach „Speichern unter“ eines neuen Dokuments klappte der Baum zu (per Test belegt); nach einem
Neuladen zeigten inaktive Tabs desselben Dokuments tote ids (per Test belegt).

1. **`TabState.id` ist eine stabile Identität**, vergeben vom Workspace. Sie überlebt jede
   Schlüsseländerung des Workspace und wechselt nur, wenn der Tab etwas anderes zeigt
   (`retargetFocusTab`) — dort ist das Zurücksetzen der Ansicht gewollt.
2. **Ansicht, Tab-Wechsel-Effekt und Suchpanel hängen an der `id`**, nicht am Schlüssel.
3. **Neuladen und Konvertieren lösen die gemerkten Ansichten aller Tabs des Dokuments über Pfade
   neu auf**, nicht nur die des aktiven Tabs. Die Ansicht bleibt dabei in `App.tsx`; ein Umzug
   in den Workspace hätte jeden Auf-/Zuklapp-Klick durch den Workspace geführt, ohne dass das
   einen Fehler behebt.

## 2026-09-25 — Ein Dokument pro Pfad, auch nach „Speichern unter“

Aus dem dritten Architektur-Review (nur Strong). Der Workspace dedupliziert Dokumente beim
Öffnen nach Pfad, aber nicht beim Umbenennen: „Speichern unter“ auf eine offene Datei ergab zwei
Tabs für denselben Pfad (per Test belegt); ein späteres Speichern im alten Tab hätte dessen
veralteten Inhalt über den neuen geschrieben.

1. **PO-Entscheidung: Das offene Dokument am Zielpfad wird geschlossen**, samt aller seiner Tabs
   (auch Fokus-Tabs), ohne Rückfrage — auch wenn es ungespeicherte Änderungen hat. Der
   Überschreiben-Dialog des Betriebssystems hat die Absicht bereits bestätigt.
2. **Durchgesetzt im Workspace** (`closeReplacedDocument`) für „Speichern unter“ und für die
   Konvertierung, jeweils erst nach erfolgreichem Schreiben.

## 2026-09-25 — Kodierung: Rundreise byte-genau (BOM, UTF-16, Deklaration)

Aus dem vierten Architektur-Review (nur Strong). Entscheidung #9 verlangt, dass die
Ursprungskodierung beim Speichern erhalten bleibt. Drei Fehler in `io.rs` brachen das, alle per
Rust-Test belegt:

1. **UTF-16 wurde als UTF-8 geschrieben** (encoding_rs kodiert UTF-16 nicht, sondern liefert
   UTF-8), die Datei deklarierte aber weiter UTF-16 und war für Jaxel danach unlesbar. `io.rs`
   kodiert UTF-16 LE/BE jetzt selbst und **immer mit BOM** — ohne BOM könnte `detect_encoding`
   die eigene Datei nicht wiedererkennen.
2. **Der BOM ging verloren.** Lesen meldet jetzt `bom`, der Workspace merkt es sich am Dokument
   (`OpenDocumentState.bom`) und gibt es beim Speichern, „Speichern unter“ und Konvertieren an
   `write_text_file` zurück. Fehlt das Feld (ältere Aufrufer, VS-Code-Host), gilt „kein BOM“.
3. **Die Deklaration wurde übersehen, sobald in den ersten 200 Bytes ein Nicht-ASCII-Zeichen
   stand** (die Prüfung verlangte gültiges UTF-8 für den ganzen Block). Eine ISO-8859-1-Datei
   mit Umlaut direkt nach der Deklaration wurde als UTF-8 gelesen und verlor beim Speichern jeden
   Umlaut. Nur die Deklaration selbst wird jetzt als Text gelesen.

Die Rundreise ist in `io.rs` getestet: lesen → unverändert speichern → Bytes identisch (UTF-16
LE/BE, UTF-8 mit/ohne BOM, ISO-8859-1).

## 2026-09-25 — Die Suche hat einen eigenen Unterbaum-Anker

Aus dem vierten Architektur-Review (nur Strong). „Nur im ausgewählten Unterbaum“ las den Bereich
aus der aktuellen Baumauswahl. Der eigene Filter der Suche kann die ausgewählte Zeile ausblenden;
dann räumt der Baum die Auswahl auf, und die Suche lief — bei weiter gesetztem Haken — über das
ganze Dokument, „Alle ersetzen“ eingeschlossen (per Test belegt). Das widersprach 18.07. #2.

1. **`searchScopeNode` in `App.tsx` ist der Anker:** der letzte Einzelknoten, den der Nutzer
   ausgewählt hat. Eine leere Auswahl löscht ihn nur, solange kein Filter aktiv ist.
2. Suche, „Alle ersetzen“ und die Aktivierung der Checkbox richten sich nach dem Anker.

## 2026-09-25 — Ein Weg zum Öffnen, der Fehler meldet

Aus dem vierten Architektur-Review (nur Strong). Nur der Öffnen-Dialog fing Fehler ab. Über
„Zuletzt geöffnet“, Drag&Drop und „Öffnen mit“ verschwand ein Fehler (fehlende Datei, kaputtes
XML) als „Unhandled rejection“ im Log; bei mehreren „Öffnen mit“-Pfaden brach die Warteschlange
beim ersten Fehler ab (per Test belegt). „Neu laden“ einer kaputten Datei schloss nur den Dialog.

1. **`openPath` in `App.tsx` ist der eine Weg zum Öffnen** und meldet jeden Fehler mit
   Dateinamen (`open.failed`). Er gibt zurück, ob die Datei offen ist; die Warteschlange läuft
   weiter.
2. **Drag&Drop ruft `openPath` über die Referenz auf die aktuelle Fassung auf** — vorher hing der
   einmal registrierte Listener an der Fassung vom Programmstart und damit an der damaligen
   Einstellung „Zuletzt geöffnete Dateien“.
3. **„Neu laden“ meldet Fehler (`reload.failed`)**; der alte Baum bleibt.

