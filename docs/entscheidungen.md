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

## 2026-09-02 — Korrekturen nach Release 0.7.0

Die beim Start bzw. durch „Öffnen mit“ übergebenen Pfade warten auf den Abschluss der
Sitzungswiederherstellung und werden danach in Queue-Reihenfolge sequenziell geöffnet. Dadurch
hat die angeforderte Datei Vorrang vor dem gespeicherten aktiven Tab und parallele Ladevorgänge
können den Fokus nicht mehr in unbestimmter Reihenfolge überschreiben. Das Tab-Schließen-`x`
wird über Flexbox an den rechten Rand des Tabs gesetzt; der Dateiname nutzt den verbleibenden
Platz und wird weiterhin per Ellipse gekürzt.
