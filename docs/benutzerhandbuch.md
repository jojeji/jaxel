# Benutzerhandbuch — Jaxel

> Wächst mit jedem Feature. Aktuell: Gerüstphase, noch keine nutzbaren Funktionen.

## Was ist Jaxel?

Jaxel ist ein Desktop-Editor für XML- und JSON-Dateien, der beide Formate in derselben kompakten
Baumansicht darstellt. Zielgruppe: technische Nutzer, die große XML/JSON-Dateien schnell durchsuchen,
punktuell bearbeiten und Knotenpfade kopieren müssen.

## Bedienung (geplant, wird pro Arbeitspaket ergänzt)

- Doppelklick auf einen Wert → Wert bearbeiten.
- Klick auf einen Knotennamen oder `F2` → Knoten umbenennen.
- Rechtsklick → Kontextmenü (Pfad kopieren, Knoten einfügen/löschen/verschieben).
- `Strg+F` → Suchen/Ersetzen.
- `Strg+Z` / `Strg+Y` → Rückgängig/Wiederholen.

## Pfad-Kopieren

- **Indizierter Pfad**: `person[0].name` — mit Array-Positionen, eindeutig referenzierbar.
- **Statischer Pfad**: `person.name` — ohne Indizes, für Schema-/Struktur-Beschreibungen.
