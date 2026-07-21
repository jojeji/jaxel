# Benutzerhandbuch — Jaxel

> Stand: AP9 (Neues Dokument, Fokus-Ansicht, Unterbaum-Suche, externe Änderungserkennung,
> Drag&Drop-Transparenz, Über-Dialog). Vorher: AP8 (Kontextmenü, vollständiger Pfad,
> Attribut-Editing, Drag&Drop im Baum, Logo).

## Was ist Jaxel?

Jaxel ist ein Desktop-Editor für XML- und JSON-Dateien, der beide Formate in derselben kompakten
Baumansicht darstellt. Zielgruppe: technische Nutzer, die große XML/JSON-Dateien schnell durchsuchen,
punktuell bearbeiten und Knotenpfade kopieren müssen.

## Dateien öffnen und speichern

- **Öffnen**: Toolbar-Button, `Strg+O` oder eine Datei einfach **aufs Fenster ziehen** (Drag&Drop).
  Der Öffnen-Dialog startet immer im zuletzt benutzten Ordner.
- **Startscreen**: Ohne offenes Dokument zeigt Jaxel die zuletzt geöffneten Dateien (Klick öffnet
  direkt) und eine Übersicht der Tastenkürzel.
- **Kommandozeile**: `jaxel datei.xml` öffnet die Datei direkt beim Start — auch mehrere
  Dateien auf einmal (`jaxel a.xml b.json`), jede bekommt ihren Tab.
- **„Öffnen mit" aus dem Dateimanager (Linux)**: Nach der Installation über das `.deb`-/`.rpm`-Paket
  ist Jaxel für XML- und JSON-Dateien als Programm registriert und erscheint im
  „Öffnen mit"-Menü des Dateimanagers (ggf. einmal ab- und wieder anmelden, falls der
  Dateimanager die Liste noch gecacht hat). Läuft Jaxel bereits, öffnet die Datei als
  neuer Tab im laufenden Fenster, und das Fenster kommt nach vorn.
- **Neu**: Toolbar-Button, `Strg+N`, der Startscreen-Button „Neues Dokument" oder ein Klick auf
  die freie Fläche rechts neben den Tabs — ein kleiner
  Dialog fragt XML oder JSON ab. Das neue Dokument startet minimal (leerer `<root></root>` bzw.
  ein leeres JSON-Objekt) und heißt bis zum ersten Speichern „Unbenannt-1" (fortlaufend
  nummeriert); `Strg+S` öffnet dafür automatisch „Speichern unter".
- **Speichern**: Toolbar-Button oder `Strg+S`. XML wird minimal-invasiv gespeichert: unveränderte
  Bereiche der Datei bleiben byte-genau erhalten.
- **Mehrere Dokumente**: jede Datei bekommt einen Tab; erneutes Öffnen derselben Datei aktiviert
  den vorhandenen Tab.
- **Sitzung wiederherstellen**: Beim Start öffnet Jaxel automatisch die Tabs der letzten
  Sitzung wieder (abschaltbar in den Einstellungen unter „Programmstart"). Unbenannte, nie
  gespeicherte Dokumente und Fokus-Ansichten werden dabei nicht wiederhergestellt.
- **Schutz vor Datenverlust**: Beim Schließen eines Tabs mit ungespeicherten Änderungen fragt
  Jaxel nach — „Speichern", „Nicht speichern" oder „Abbrechen". Dasselbe gilt beim Schließen des
  Fensters; sind mehrere Dokumente betroffen, werden sie aufgelistet und „Alle speichern"
  speichert sie in einem Rutsch (noch nie gespeicherte Dokumente fragen dabei nach einem
  Dateinamen; ein Abbruch dort bricht das gesamte Schließen ab). Das Schließen einer
  Fokus-Ansicht fragt nicht, solange das Dokument in einem anderen Tab geöffnet bleibt —
  dabei geht nichts verloren.
- **Extern geänderte Dateien**: Wurde eine offene Datei von einem anderen Programm verändert,
  fragt Jaxel beim nächsten Zurückwechseln ins Fenster nach, ob neu geladen werden soll (Namen,
  Werte, Attribute — der komplette Baum wird neu eingelesen; die Auswahl und aufgeklappte
  Knoten bleiben dabei so gut wie möglich erhalten, sofern sie noch existieren). Gibt es zu
  diesem Zeitpunkt eigene, ungespeicherte Änderungen, erscheint der Dialog **immer** — ein
  „Neu laden" verwirft dann die eigenen Änderungen. In den Einstellungen lässt sich stattdessen
  ein automatisches Neuladen aktivieren (greift ebenfalls nie bei ungespeicherten Änderungen).
  Der Dialog verlangt eine bewusste Wahl: Ein Klick auf den abgedunkelten Hintergrund wird
  ignoriert; `Escape` bedeutet „Meine Version behalten". Ohne eigene Änderungen sind „Neu laden"
  und dessen Tastaturfokus hervorgehoben, mit eigenen Änderungen die sichere Aktion „Meine Version
  behalten". Andere Dialoge werden nicht überlagert — die Meldung wartet, bis sie geschlossen
  sind. „Meine Version behalten" quittiert den zu diesem Zeitpunkt neuesten Stand auf der Platte,
  damit mehrere zwischenzeitliche externe Änderungen nicht nacheinander gemeldet werden; erst eine
  spätere Änderung löst wieder eine Meldung aus.

## Baumansicht und Navigation

- **Klick** auf einen Knoten: auswählen und (bei Containern) auf-/zuklappen.
- **Rechtsklick** öffnet das Kontextmenü mit allen Knoten-Aktionen (Pfade kopieren, Kind
  anlegen, Duplizieren, Kopieren/Einfügen, Löschen).
- **Pfeiltasten**: `↑`/`↓` bewegen die Auswahl, `→` klappt auf bzw. springt ins erste Kind,
  `←` klappt zu bzw. springt zum Elternknoten.
- **Verschieben per Drag&Drop**: Knoten einfach ziehen. Beim Ziehen ist die Zeile halbtransparent,
  damit die Einfüge-Linie/Als-Kind-Markierung darunter sichtbar bleibt. Eine Linie zwischen den
  Zeilen zeigt die Ziel-Position als Geschwister; landet der Mauszeiger mittig auf einer Zeile,
  wird sie hervorgehoben und der Knoten dort als Kind eingehängt. Nicht möglich: die Wurzel
  ziehen oder einen Knoten in seinen eigenen Unterbaum verschieben.
- **Fokus-Ansicht ab einem Knoten**: Rechtsklick → „Fokus ab hier öffnen" öffnet einen neuen Tab,
  der nur den Unterbaum ab diesem Knoten zeigt (praktisch wie ein eigenes kleines Dokument) —
  bearbeiten, Undo/Redo und Speichern wirken dabei weiterhin auf die eine echte Datei. Eine
  Breadcrumb-Leiste über dem Baum zeigt den Pfad von der echten Wurzel bis zum Fokus-Knoten;
  Klick auf ein höheres Element verschiebt den Fokus dorthin (Klick auf die Wurzel verlässt den
  Fokus). Wird der fokussierte Knoten gelöscht, springt der Fokus automatisch eine Ebene höher.
- Das rechte Seitenpanel zeigt die **Attribute** des ausgewählten Knotens: Namen UND Werte
  direkt ändern, `×` entfernt ein Attribut. Ein neues Attribut entsteht, sobald du im
  Namensfeld der letzten Zeile zu tippen beginnst — es erscheint sofort im Baum.

## Bearbeiten

- **Name ändern**: Doppelklick auf den Namen oder `F2`.
- **Wert ändern**: Doppelklick auf den Wert oder `Enter` (bei Blattknoten).
- **Kind anlegen**: `Strg` + `+` oder Toolbar-Plus — der neue Knoten steht sofort im
  Namens-Editor, einfach lostippen und mit `Enter` bestätigen.
- **Duplizieren**: `Strg+D` — kopiert den Knoten samt Unterbaum direkt darunter.
- **Löschen**: `Entf` (die Wurzel ist nicht löschbar).
- **Kopieren/Einfügen**: `Strg+C` legt den Knoten als XML-/JSON-Text in die System-Zwischenablage
  (auch in andere Programme einfügbar); `Strg+V` fügt Zwischenablage-Inhalt als nächstes
  Geschwister unter der Auswahl ein (bei ausgewählter Wurzel: als letztes Kind).
- **Rückgängig/Wiederholen**: `Strg+Z` / `Strg+Y` — jede sichtbare Aktion ist genau ein Schritt,
  auch „Alle ersetzen".

## Suchen, Ersetzen, Filtern

`Strg+F` öffnet das Suchpanel am unteren Rand und setzt den Tastaturfokus direkt in das Suchfeld
(Schließen mit `Esc` oder `×`). Das funktioniert auch, wenn gerade ein anderes normales Textfeld
fokussiert ist. Ist die Suche bereits offen, markiert `Strg+F` den vorhandenen Suchbegriff komplett,
sodass direktes Tippen ihn ersetzt, ohne Optionen oder Treffer zurückzusetzen. Ein geöffneter
Entscheidungsdialog behält dagegen bewusst den Fokus.

- **Scope**: Alles, nur Namen, nur Werte oder nur Attribute; optional Groß-/Kleinschreibung
  und Regex.
- **Nur im ausgewählten Unterbaum**: schränkt die Suche (und „Alle ersetzen") auf den im Baum
  gerade ausgewählten Knoten samt Nachfahren ein — folgt live der aktuellen Auswahl, ohne
  Auswahl deaktiviert. In einer Fokus-Ansicht (siehe oben) bezieht sich „Alles" ohnehin nur auf
  den fokussierten Unterbaum.
- **Trefferliste**: alle Treffer erscheinen als Tabelle (Pfad-Spalte, Treffer-Spalte) mit ihrem
  indizierten Pfad — ein Klick springt zum Knoten im Baum, `Weiter`/`Zurück` navigieren zyklisch
  und springen sofort. Ist der Pfad zu lang für die Spalte, bleiben die letzten beiden Segmente
  (Treffer + direkter Parent) immer vollständig sichtbar, frühere Vorfahren-Segmente werden mit
  „…" gekürzt. Ein Rechtsklick auf eine Trefferzeile öffnet dasselbe Kontextmenü wie im Baum
  (vollständigen/indizierten/statischen Pfad kopieren), ohne die Zeile zusätzlich zu selektieren.
  In den Einstellungen lässt sich unter „Namespace-Präfixe in der Trefferliste anzeigen"
  festlegen, ob Namespace-Präfixe (z. B. `ram:`) in Pfad und Treffer-Text angezeigt werden
  (Standard: ausgeblendet) — betrifft nur diese Anzeige, nicht die Suche selbst und nicht
  Baum/Eigenschaften-Panel.
- **Tastaturnavigation im Suchfeld**: `Enter` sucht (falls sich der Suchbegriff geändert hat oder
  noch keine Treffer vorliegen) und springt sofort zum ersten Treffer. Danach bewegen `↑`/`↓` nur
  die Markierung in der Trefferliste (mit Wraparound), ohne den Baum zu verändern — man kann also
  in Ruhe durchblättern oder weitertippen. Erneutes `Enter` springt zum gerade markierten Treffer;
  ändert man stattdessen den Suchbegriff und drückt `Enter`, beginnt eine komplette neue Suche
  wieder bei Treffer 1.
- **Filtern**: reduziert den Baum auf Treffer und ihre Vorfahren. In den Einstellungen lässt
  sich zusätzlich der komplette Unterbaum jedes Treffers einblenden.
- **Ersetzen**: „Alle ersetzen" ersetzt in allen Treffern — als ein einziger Undo-Schritt.
- **Größe und Position**: Der obere Rand des Suchpanels lässt sich mit der Maus ziehen, um der
  Trefferliste mehr Platz zu geben. Ein Dock-Umschalter am Suchpanel verschiebt die Suche wahlweise
  an den rechten Rand — dort teilt sie sich mit dem Eigenschaften-Panel eine Sidebar mit zwei
  Tabs („Eigenschaften"/„Suchen"), deren Breite ebenfalls ziehbar ist. `Esc` oder `×` wechseln in
  diesem Modus nur zum Eigenschaften-Tab zurück (Suchbegriff und Trefferliste bleiben im
  Hintergrund erhalten); `Strg+F` schaltet wieder aktiv auf den Suchen-Tab. Größe, Breite und die
  gewählte Seite werden gemerkt. Das Umschalten der Seite selbst startet dagegen eine neue,
  leere Suche.

## Status- und Fehlermeldungen

Kurze Rückmeldungen wie „Pfad kopiert", „Datei neu geladen" oder Fehler der Zwischenablage
erscheinen oben mittig als leicht transparente, schwebende Meldungen. Sie verschieben Baum,
Eigenschaften-Panel und Eingabefelder nicht.

- Statusmeldungen verschwinden nach **4 Sekunden**, Fehlermeldungen nach **8 Sekunden**.
- Das `×` schließt eine Meldung sofort.
- Solange der Mauszeiger oder der Tastaturfokus auf einer Meldung liegt, pausiert ihre Restlaufzeit.
- Fehler und Status können gleichzeitig erscheinen; die neueste Meldung steht oben.

## Base64-Inhalte anzeigen

Manche XML-Dateien (z. B. Spooler-VOL-Dateien) betten Dateien als Base64-Text ein. Jaxel
erkennt solche Werte automatisch (ab ca. 64 Zeichen) und zeigt ein kleines **„base64"-Badge**
an der Baumzeile bzw. neben dem Attributwert im Attribute-Panel:

- **Klick auf das Badge** dekodiert den Inhalt: Text erscheint in einem Vorschaufenster —
  ist es XML oder JSON, kann es direkt **als neuer Tab** geöffnet werden (ein eigenständiges,
  unbenanntes Dokument ohne Verbindung zur Quelle). Binärinhalte (PDF, Bilder, ZIP …) werden
  als temporäre Datei gespeichert und im Standardprogramm des Systems geöffnet.
- **Kontextmenü → „Als Base64 dekodieren"** funktioniert auf jedem Knoten mit Wert — auch
  dann, wenn die automatische Erkennung kein Badge zeigt (z. B. bei sehr kurzen Inhalten).
- Das Dekodieren ist eine **reine Ansicht**: Änderungen daran fließen nicht in das
  Ursprungsdokument zurück.

## Pfad kopieren

Für den ausgewählten Knoten über Toolbar oder Kontextmenü:

- **Vollständiger Pfad** (`Strg+Shift+C`): `catalog.person.name` — ALLE Ebenen inklusive
  Wurzel, ohne Indizes, Namespace-Präfixe (`ns:`) werden abgeschnitten.
- **Indizierter Pfad**: `person[0].name` — mit Positionen, eindeutig referenzierbar.
- **Statischer Pfad**: `person.name` — ohne Indizes, für Schema-/Struktur-Beschreibungen.

## Einstellungen

Zahnrad-Button oben rechts: **Theme** (Hell ist Standard, dazu sechs weitere: Dunkel, Nordlicht,
Tanne, Terrakotta, Kobalt, Kontrast — jeweils EIN Akzentton, kontrastgeprüft), **Sprache**
(Deutsch/Englisch), Such-Filter-Verhalten, **externe Änderungen** (automatisches Neuladen
ein-/ausschalten) und der Fenster-Modus („eigene Fenster pro Dokument" ist angekündigt, aber
noch nicht verfügbar).

## Über Jaxel

Info-Symbol (ⓘ) oben rechts in der Toolbar: Versionsnummer und die Entwickler des Projekts.
Dazu **„Logdatei öffnen"** — nützlich für Fehlerberichte: Die Datei enthält das technische
Protokoll der laufenden Sitzung.

Jaxel schreibt seit AP15 laufend in diese Logdatei (begrenzt auf 5 MB, eine Vorgängerdatei
bleibt erhalten): Programmstart mit Version und Plattform, welche Dateien geöffnet/gespeichert/
neu geladen wurden, jede angezeigte Fehlermeldung sowie Abstürze beider Seiten (Rust-Panics und
JavaScript-Fehler im Webview) samt Stacktrace. So lässt sich nach einem Absturz nachvollziehen,
was passiert ist und was zuvor getan wurde. **Niemals** im Log stehen Dokumentinhalte,
Knotenwerte, Suchbegriffe oder dekodierte Base64-Inhalte — protokolliert werden ausschließlich
Dateipfade, Fehlermeldungen und technische Metadaten.

## Tastenkürzel

| Kürzel | Aktion |
| --- | --- |
| `Strg+N` | Neues Dokument |
| `Strg+O` | Datei öffnen |
| `Strg+S` | Speichern |
| `Strg+F` | Suchen/Ersetzen |
| `↑ ↓ ← →` | Im Baum navigieren |
| `F2` | Umbenennen |
| `Enter` | Wert ändern |
| `Strg` + `+` | Neuen Knoten als Geschwister anlegen (gleiche Ebene) |
| `Strg+Shift` + `+` | Neuen Knoten als Kind anlegen (eine Ebene tiefer) |
| `Strg+D` | Duplizieren |
| `Strg+C` / `Strg+V` | Knoten kopieren / einfügen |
| `Strg+Shift+C` | Vollständigen Pfad kopieren |
| `Entf` | Löschen |
| `Strg+Z` / `Strg+Y` | Rückgängig / Wiederholen |

Ausnahme: Auf der Wurzel des aktuell sichtbaren Baums (Dokumentwurzel bzw. Wurzel einer
Fokus-Ansicht) gibt es keine Geschwister-Ebene — dort legen beide Kürzel ein Kind an.
