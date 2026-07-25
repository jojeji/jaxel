# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei
dokumentiert. Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [SemVer](https://semver.org/lang/de/) (vor 1.0.0 gilt:
Minor = Funktionsstand geändert, Patch = nur Korrekturen).

Gepflegt wird GROB (Nutzersicht, kein technisches Bug-Protokoll — Details stehen in
`docs/status.md` und der Git-Historie). Laufende Arbeit sammelt sich unter *Unreleased*;
eine Version wird erst beim PO-Kommando „Release" geschnitten.

## [Unreleased]

### Behoben

- **Kritisch: DOCTYPE und Kommentare über der Wurzel gingen beim Speichern verloren.** Eine
  XML-Datei nur zu öffnen und zu speichern — ohne jede Bearbeitung — entfernte die
  `<!DOCTYPE …>`-Zeile, alle Kommentare vor dem Wurzel-Element und alles nach dem schließenden
  Wurzel-Tag. Bei Dateien mit DTD-Referenz konnte das dazu führen, dass sie von anderen
  Programmen nicht mehr korrekt verarbeitet wurden. Betrifft nur künftige Speichervorgänge —
  bereits gespeicherte Dateien sollten geprüft werden. (Gleicher Fehlertyp wie der in 0.3.2
  behobene Verlust der XML-Deklaration.)
- Eine Datei ohne abschließende Zeilenschaltung bekommt beim Speichern keine mehr aufgezwungen.

### Hinzugefügt

- **Kommentare im Baum:** XML-Kommentare erscheinen jetzt als eigene, grün-kursive Zeilen an
  ihrer Position im Dokument — statt unsichtbar zu bleiben. Enthält ein Kommentar wohlgeformtes
  XML, wird er als aufklappbare Struktur dargestellt. Über das Kontextmenü lassen sich Knoten
  **auskommentieren** und wieder **einkommentieren**; bei mehreren markierten Knoten wirkt das
  auf alle, als ein Rückgängig-Schritt. Knoten, die selbst schon einen Kommentar oder ein „--"
  enthalten, lassen sich nicht auskommentieren (XML erlaubt das nicht) — der Menüeintrag ist
  dann ausgegraut und nennt beim Darüberfahren den Grund. Über das Kontextmenü lassen sich auch
  **neue Kommentare einfügen** (als Geschwister oder als Kind). Innerhalb eines auskommentierten
  Bereichs ist Bearbeiten gesperrt, solange er nicht wieder eingeschaltet ist — sonst gingen die
  Änderungen beim Speichern verloren. Die Suche findet Treffer auch in auskommentierten
  Bereichen; „Alle ersetzen" lässt sie unangetastet und sagt hinterher, wie viele es waren.
- **Mehrfachauswahl im Baum:** `Strg`+Klick wählt einzelne Knoten zusätzlich aus, `Shift`+Klick
  einen ganzen Bereich, `Shift`+`↑`/`↓` erweitert die Auswahl zeilenweise. Die Auswahl darf über
  verschiedene Ebenen hinweg gehen. **Löschen**, **Duplizieren**, **Kopieren** und **Verschieben
  per Drag&Drop** wirken dann auf alle ausgewählten Knoten — jeweils als ein Schritt, den ein
  einziges „Rückgängig" komplett zurücknimmt. Umbenennen, Wert ändern und Knoten anlegen brauchen
  weiterhin genau einen ausgewählten Knoten.
- **„Speichern unter"** als eigener Menüpunkt (Menü „Datei", `Strg+Shift+S`) — bisher erschien der
  Dialog nur automatisch beim ersten Speichern eines neuen Dokuments.
- **XML↔JSON konvertieren:** In „Speichern unter" einfach die Endung des anderen Formats wählen.
  Eine Rückfrage nennt vorher, was dabei verloren geht; danach ist das offene Tab ein Dokument
  des neuen Formats. XML-Attribute werden zu Eigenschaften mit `@`-Präfix (und wieder zurück),
  der Textinhalt eines Elements mit Attributen zu `#text`. Lässt sich ein JSON-Schlüssel nicht in
  einen XML-Elementnamen übersetzen (z. B. `"1. Quartal"`), bricht die Konvertierung mit einer
  Meldung ab, statt stillschweigend umzubenennen — es wird dann keine Datei geschrieben.

## [0.5.0] - 2026-07-25

### Hinzugefügt

- **Klassische Menüleiste** (Datei/Bearbeiten/Ansicht/Extras/Hilfe) oberhalb der Toolbar —
  seltenere Aktionen (Kind hinzufügen, Duplizieren, Löschen, alle Pfad-kopieren-Varianten,
  Einfügen, Über Jaxel) sind jetzt dort statt als Icon zu finden. Die Toolbar bleibt für die
  häufigsten Aktionen (Neu, Öffnen, Speichern, Suchen, Einstellungen) und hat neu
  **Rückgängig/Wiederholen** als eigene Buttons.

### Behoben

- **Kritisch: zweites Speichern konnte die XML zerstören.** Ein Feld ändern und speichern, dann
  ein anderes Element ändern und erneut speichern, konnte zu einer beschädigten Datei führen.
  Betraf nur XML (nicht JSON).
- **Kritisch: Speichern → Rückgängig → erneut Speichern schrieb den geänderten statt den
  ursprünglichen Wert** (teils ebenfalls beschädigte XML). Betraf nur XML.

## [0.4.1] - 2026-07-22

### Behoben

- **Baum kollabierte beim Tab-Wechsel:** Wechselte man den Tab und kehrte zurück, war der Baum
  wieder komplett zugeklappt statt genau so offen zu bleiben wie vorher. Der Auf-/Zuklapp-Zustand
  wird jetzt pro Tab gemerkt.

## [0.4.0] - 2026-07-22

### Hinzugefügt

- **Ungespeicherte Änderungen sichtbar am Tab:** Ein Tab mit ungespeicherten Änderungen zeigt
  einen Punkt statt des Schließen-Kreuzes (Hover zeigt trotzdem `×`). Verschwindet auch, wenn per
  Rückgängig exakt bis zum letzten Speicherstand zurückgegangen wird, ohne dass erneut gespeichert
  werden muss.
- **Optionale Baum-Änderungsmarker** (Einstellungen → „Baum", standardmäßig aus): geänderte und
  neue Knoten seit dem letzten Speichern werden mit einem farbigen Punkt markiert, zugeklappte
  Vorfahren mit Änderungen im Unterbaum blass. Gelöschte Knoten bleiben als durchgestrichene,
  rein informative Tombstone-Zeile an ihrer ursprünglichen Position sichtbar, bis gespeichert wird.

## [0.3.2] - 2026-07-22

### Behoben

- **XML-Deklaration ging beim Speichern verloren:** Der minimal-invasive Speicherpfad hat die
  `<?xml version="…" encoding="…"?>`-Zeile bei jedem Speichern stillschweigend entfernt. Bei
  Dateien mit expliziter Nicht-UTF-8-Kodierung konnte das dazu führen, dass die Datei danach von
  anderen Programmen falsch gelesen wurde (fehlende Kodierungsangabe). Betrifft nur künftige
  Speichervorgänge — bereits gespeicherte Dateien sollten geprüft werden.

## [0.3.1] - 2026-07-22

### Behoben

- **Suchtreffer-Tabelle:** Die Wert-Spalte zeigte bei Treffern im Elementnamen den Namen ein
  zweites Mal an, statt den eigentlichen Elementinhalt. Zeigt jetzt einheitlich den Inhalt
  (bzw. die Kindanzahl, wenn das Element keinen eigenen Textwert hat).

## [0.3.0] - 2026-07-21

### Hinzugefügt

- **Trefferliste als Tabelle:** Pfad und Treffer stehen jetzt sauber in Spalten untereinander.
  Zu lange Pfade werden platzsparend gekürzt (die letzten zwei Segmente bleiben immer
  vollständig sichtbar). Namespace-Präfixe (z. B. `ram:`) sind standardmäßig ausgeblendet,
  lassen sich in den Einstellungen aber wieder einblenden.
- **Rechtsklick auf einen Suchtreffer** kopiert dessen Pfad — indiziert, statisch oder
  vollständig, genau wie im Baum.
- **Tastaturnavigation in der Trefferliste:** Pfeil hoch/runter bewegt nur die Markierung,
  Enter springt zum markierten Treffer; ein geänderter Suchbegriff startet mit Enter eine
  frische Suche.
- **Suchpanel ziehbar und andockbar:** Höhe per Ziehgriff anpassbar; wahlweise an den rechten
  Rand andocken, wo es sich mit dem Eigenschaften-Panel eine Sidebar mit Tabs teilt.
- **Zuverlässiges `Strg+F`:** öffnet die Suche bzw. fokussiert das bereits offene Suchfeld
  zuverlässig und markiert den vorhandenen Suchbegriff komplett.
- **Schwebende Status- und Fehlermeldungen:** ersetzen die bisherigen Banner im Layoutfluss —
  Ein-/Ausblenden verschiebt Baum und Panels nicht mehr.

### Behoben

- **Baum sprang beim Auf-/Zuklappen:** Der gerade ein-/ausgeklappte Knoten blieb nicht an
  seiner Bildschirmposition, sondern konnte nach unten wegspringen und so den Blickfokus
  verlieren lassen.
- **Reload-Dialog bei extern geänderten Dateien:** Ein Klick, der nur das Fenster
  reaktivierte, konnte versehentlich als „Meine Version behalten" gewertet werden.

## [0.2.0] - 2026-07-20

### Hinzugefügt

- **Fünf neue Themes:** Nordlicht, Tanne, Terrakotta, Kobalt, Kontrast — zusätzlich zum
  bestehenden hellen Standard-Theme, wählbar in den Einstellungen.
- **Portabler Windows-Build:** ZIP mit eigenständiger `.exe`, keine Installation nötig
  (neben dem bisherigen NSIS-Installer).

### Behoben

- **Fenster ließ sich nicht schließen:** Fehlende Tauri-Berechtigung verhinderte das
  Schließen des Hauptfensters (weder per X-Button noch per Alt+F4) — ohne Fehlermeldung.

## [0.1.0] - 2026-07-19

### Hinzugefügt

- **XML-/JSON-Baumeditor:** Datei öffnen (Dialog, Kommandozeilen-Argument oder Drag&Drop
  aufs Fenster) und in einer virtualisierten Baumansicht anzeigen — auch bei sehr großen
  Dateien (getestet mit 184 MB / 6 Mio. Knoten).
  Beide Formate teilen sich dieselbe Baumdarstellung.
- **Bearbeiten:** Name, Wert und Attribute (inkl. Attributnamen) direkt im Baum ändern;
  Knoten anlegen/duplizieren/löschen; Verschieben per Drag&Drop mit Einfüge-Linie
  (als Geschwister oder als Kind); vollständiges Undo/Redo (ein sichtbarer Nutzerschritt
  = ein Undo-Schritt).
- **Tastaturbedienung:** Pfeiltasten zum Navigieren, `F2`/`Enter` zum Umbenennen/Editieren,
  `Strg+D` Duplizieren, `Strg+C`/`Strg+V` Kopieren/Einfügen über die System-Zwischenablage,
  `Strg` + `+` neuer Knoten als Geschwister, `Strg+Shift` + `+` neuer Knoten als Kind.
- **Suchen/Ersetzen** mit Trefferliste, Filtermodus (Baum auf Treffer + Vorfahren reduzieren)
  und „Alle ersetzen" als ein einziger Undo-Schritt.
- **Pfad kopieren** in drei Notationen: indiziert (`person[0].name`), statisch
  (`person.name`) und vollständig inkl. Wurzel (`catalog.person.name`).
- **Kontextmenü** im Baum (Rechtsklick) mit allen Knoten-Aktionen.
- **Mehrere Dokumente als Tabs**, Grundeinstellungen (Theme, Sprache, Suchfilter-Verhalten).
- **Startscreen** mit „Zuletzt geöffnet"-Liste und Tastenkürzel-Übersicht.
- **Eigenes Logo** und App-Icons; deutsch/englische Oberfläche.
- **Linux-Pakete:** AppImage (portabel), .deb, .rpm.
- **Absturz- und Fehler-Logging:** Rust-Panics und JavaScript-Fehler landen mit Kontext in
  einer Logdatei (über den Über-Dialog erreichbar), ebenso jede angezeigte Fehlermeldung und
  ein schlankes Grundrauschen (Programmstart, Datei geöffnet/gespeichert/neu geladen — nur
  Pfade, nie Inhalte). Ein Renderfehler zeigt jetzt eine Fehlerseite mit Hinweis auf die
  Logdatei statt eines weißen Fensters.

### Geändert

- Optik grundlegend überarbeitet: helles, aufgeräumtes Theme als Standard (zuvor dunkel),
  neue Icon-Toolbar statt Text-Buttons.
- `Strg+Plus` legt jetzt ein Geschwister (gleiche Ebene) statt eines Kindes an; ein neues Kind
  entsteht über `Strg+Shift+Plus`. Auf der Wurzel der aktuell sichtbaren Ansicht (Dokument
  oder Fokus-Ansicht) legen weiterhin beide Kürzel ein Kind an, da es dort keine sichtbare
  Geschwister-Ebene gibt.

### Behoben

- Absturz beim Wechsel zwischen offenen Dokumenten, während das Suchpanel noch Treffer des
  vorherigen Dokuments anzeigte.
