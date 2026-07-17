# Benutzerhandbuch — Jaxel

> Stand: AP7 (Feinschliff Optik + Bedienung).

## Was ist Jaxel?

Jaxel ist ein Desktop-Editor für XML- und JSON-Dateien, der beide Formate in derselben kompakten
Baumansicht darstellt. Zielgruppe: technische Nutzer, die große XML/JSON-Dateien schnell durchsuchen,
punktuell bearbeiten und Knotenpfade kopieren müssen.

## Dateien öffnen und speichern

- **Öffnen**: Toolbar-Button, `Strg+O` oder eine Datei einfach **aufs Fenster ziehen** (Drag&Drop).
  Der Öffnen-Dialog startet immer im zuletzt benutzten Ordner.
- **Startscreen**: Ohne offenes Dokument zeigt Jaxel die zuletzt geöffneten Dateien (Klick öffnet
  direkt) und eine Übersicht der Tastenkürzel.
- **Kommandozeile**: `jaxel datei.xml` öffnet die Datei direkt beim Start.
- **Speichern**: Toolbar-Button oder `Strg+S`. XML wird minimal-invasiv gespeichert: unveränderte
  Bereiche der Datei bleiben byte-genau erhalten.
- **Mehrere Dokumente**: jede Datei bekommt einen Tab; erneutes Öffnen derselben Datei aktiviert
  den vorhandenen Tab.

## Baumansicht und Navigation

- **Klick** auf einen Knoten: auswählen und (bei Containern) auf-/zuklappen.
- **Pfeiltasten**: `↑`/`↓` bewegen die Auswahl, `→` klappt auf bzw. springt ins erste Kind,
  `←` klappt zu bzw. springt zum Elternknoten.
- Das rechte Seitenpanel zeigt die **Attribute** des ausgewählten Knotens: Werte direkt ändern,
  `×` entfernt ein Attribut, die unterste Zeile fügt ein neues hinzu.

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

`Strg+F` öffnet das Suchpanel am unteren Rand (Schließen mit `Esc` oder `×`):

- **Scope**: Alles, nur Namen, nur Werte oder nur Attribute; optional Groß-/Kleinschreibung
  und Regex.
- **Trefferliste**: alle Treffer erscheinen als klickbare Liste mit ihrem indizierten Pfad —
  ein Klick springt zum Knoten im Baum. `Weiter`/`Zurück` navigieren zyklisch.
- **Filtern**: reduziert den Baum auf Treffer und ihre Vorfahren. In den Einstellungen lässt
  sich zusätzlich der komplette Unterbaum jedes Treffers einblenden.
- **Ersetzen**: „Alle ersetzen" ersetzt in allen Treffern — als ein einziger Undo-Schritt.

## Pfad kopieren

Für den ausgewählten Knoten über die Toolbar:

- **Indizierter Pfad**: `person[0].name` — mit Positionen, eindeutig referenzierbar.
- **Statischer Pfad**: `person.name` — ohne Indizes, für Schema-/Struktur-Beschreibungen.

## Einstellungen

Zahnrad-Button oben rechts: **Theme** (Hell ist Standard, Dunkel optional), **Sprache**
(Deutsch/Englisch), Such-Filter-Verhalten und der Fenster-Modus („eigene Fenster pro Dokument"
ist angekündigt, aber noch nicht verfügbar).

## Tastenkürzel

| Kürzel | Aktion |
| --- | --- |
| `Strg+O` | Datei öffnen |
| `Strg+S` | Speichern |
| `Strg+F` | Suchen/Ersetzen |
| `↑ ↓ ← →` | Im Baum navigieren |
| `F2` | Umbenennen |
| `Enter` | Wert ändern |
| `Strg` + `+` | Kind anlegen |
| `Strg+D` | Duplizieren |
| `Strg+C` / `Strg+V` | Knoten kopieren / einfügen |
| `Entf` | Löschen |
| `Strg+Z` / `Strg+Y` | Rückgängig / Wiederholen |
