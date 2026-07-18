# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei
dokumentiert. Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [SemVer](https://semver.org/lang/de/) (vor 1.0.0 gilt:
Minor = Funktionsstand geändert, Patch = nur Korrekturen).

Gepflegt wird GROB (Nutzersicht, kein technisches Bug-Protokoll — Details stehen in
`docs/status.md` und der Git-Historie). Laufende Arbeit sammelt sich unter *Unreleased*;
eine Version wird erst beim PO-Kommando „Release" geschnitten.

## [Unreleased]

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
  `Strg` + `+` neues Kind anlegen.
- **Suchen/Ersetzen** mit Trefferliste, Filtermodus (Baum auf Treffer + Vorfahren reduzieren)
  und „Alle ersetzen" als ein einziger Undo-Schritt.
- **Pfad kopieren** in drei Notationen: indiziert (`person[0].name`), statisch
  (`person.name`) und vollständig inkl. Wurzel (`catalog.person.name`).
- **Kontextmenü** im Baum (Rechtsklick) mit allen Knoten-Aktionen.
- **Mehrere Dokumente als Tabs**, Grundeinstellungen (Theme, Sprache, Suchfilter-Verhalten).
- **Startscreen** mit „Zuletzt geöffnet"-Liste und Tastenkürzel-Übersicht.
- **Eigenes Logo** und App-Icons; deutsch/englische Oberfläche.
- **Linux-Pakete:** AppImage (portabel), .deb, .rpm.

### Geändert

- Optik grundlegend überarbeitet: helles, aufgeräumtes Theme als Standard (zuvor dunkel),
  neue Icon-Toolbar statt Text-Buttons.

### Behoben

- Absturz beim Wechsel zwischen offenen Dokumenten, während das Suchpanel noch Treffer des
  vorherigen Dokuments anzeigte.
