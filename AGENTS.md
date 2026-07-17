# Arbeitsanweisung für KI-Agenten in diesem Projekt

> Gilt für jedes KI-Modell, das hier arbeitet. Pflichtlektüre vor der ersten Code-Änderung.

## Was dieses Projekt ist

**Jaxel** ist ein plattformunabhängiger XML/JSON-Editor (Desktop, Tauri 2 + Rust-Kern + React/TypeScript),
Ersatz für Easy XML Editor (kein Linux-Support). Monorepo mit npm-Workspaces:
`packages/core` = UI-freier, headless-testbarer Modellkern; `apps/editor` = Vite/React-UI + Tauri.
Ansprechpartner ist der PO (Joey) — technischer Nutzer und Product Owner zugleich.

Referenz- und Schwesterprojekt für Stack, Codekultur und Design: `../xdp-designer` (gleiche Firma,
gleicher PO). Bei Unsicherheit über Muster (Command-Bus, CSS-Variablen-Theme, Tauri-Setup) lohnt ein
Blick dorthin — aber **nicht blind kopieren**: Jaxel hat bewusst andere Invarianten (siehe unten).

## Pflichtlektüre in dieser Reihenfolge

1. `docs/architektur.md` — Ein-Seiten-Landkarte.
2. `docs/entscheidungen.md` — Entscheidungslog, maßgeblich bei Widersprüchen. Enthält auch eine
   Liste "ausdrücklich NICHT geplant" — nicht versehentlich nachbauen.
3. `docs/status.md` — Ist-Stand je Arbeitspaket.
4. Ursprünglicher Kickoff-Plan (Grilling-Ergebnis): `~/.claude/plans/breezy-churning-heron.md`.

## Zentrale Invarianten (nicht aufweichen)

1. **Geparster Baum ist die einzige Wahrheit.** Kein paralleles Datenmodell, kein Spiegel-State.
2. **Jede Mutation läuft als Command** über den CommandBus (`packages/core/src/commands`).
   Ein sichtbarer Nutzerschritt = ein Undo-Schritt (Composite bei Bedarf).
3. **Logik React-frei und headless testbar** (`*.ts` in `packages/core`, getrennt von `*.tsx`).
4. **Minimal-invasives Speichern:** unveränderte Knoten behalten ihren Original-Bytebereich; nur
   geänderte werden reserialisiert. Das ist *kein* hartes Byte-Identität-Invariant wie bei
   xdp-designer — best effort reicht, siehe `docs/entscheidungen.md` #1.
5. **XML und JSON teilen ein gemeinsames `DocNode`-Modell**, damit beide in derselben Baumkomponente
   praktisch identisch dargestellt werden (Mapping-Regeln: `docs/entscheidungen.md` #4).
6. **Keine XSD/DTD-Validierung.** Ausdrücklich nicht geplant, auch nicht später (`docs/entscheidungen.md`).
7. UI-Text zweisprachig (Deutsch + Englisch) über den schlanken i18n-Layer in `apps/editor/src/i18n`.

## Bei Unklarheiten: fragen, nicht raten

Fachliche Unklarheit ⇒ den PO fragen (AskUserQuestion oder klare Rückfrage). Getroffene Annahmen
immer als Annahme kennzeichnen und in `docs/status.md` dokumentieren.

## Arbeitsweise (Definition of Done für jede Änderung)

1. Vorher `git status` prüfen: fremde/uncommittete Änderungen respektieren, nie `git add -A` —
   explizite Pfade stagen.
2. Nach jeder Änderung: `npm test` (vitest in `packages/core`), `tsc --noEmit` in betroffenen
   Paketen, bei UI-Änderungen `npm run dev` real ausprobieren (nicht nur Typecheck).
3. **Doku-Pflicht:** Abschluss-Absatz in `docs/status.md` (was, warum, bewusste Vereinfachungen,
   offene Punkte); bei sichtbaren Feature-Änderungen `docs/benutzerhandbuch.md` nachziehen; neue
   grundsätzliche Entscheidungen in `docs/entscheidungen.md` anhängen (nicht bestehende Einträge
   umschreiben).
4. Nach größeren Arbeitspaketen: `graphify`- bzw. `understand`-Skill laufen lassen, damit der
   Wissensgraph aktuell bleibt und Stellen im Code wiederauffindbar sind.
5. Karpathy-Guidelines gelten: keine Features über den Auftrag hinaus, chirurgische Änderungen,
   Annahmen explizit machen, Erfolgskriterien vor der Umsetzung definieren.
