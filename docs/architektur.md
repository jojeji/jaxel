# Architektur-Kurzübersicht — Jaxel

Ein-Seiten-Landkarte. Details und Begründungen stehen in [entscheidungen.md](entscheidungen.md).

## Was ist Jaxel?

Ein plattformunabhängiger XML/JSON-Editor (Linux/Windows Pflicht, macOS optional), installierbar und
portabel, als Ersatz für Easy XML Editor (nicht für Linux verfügbar). Referenzprojekt für Stack und
Codekultur: `../xdp-designer` (Schwesterprojekt, gleiche Firma).

## Schichten

```
apps/editor/src-tauri  (Rust)     Datei-I/O, Encoding-Erkennung (encoding_rs), Bundling
        ↕ Tauri-Commands (IPC)
apps/editor/src        (React)    Baumansicht, Panels, Tabs, Settings, Hotkeys — reine Darstellung/Interaktion
        ↕ importiert
packages/core/src      (TS)       DocNode-Modell, CommandBus/Undo, XML/JSON-Parser+Serializer,
                                   Pfade, Suche — UI-frei, headless mit vitest getestet
```

**Abweichung vom Ursprungsplan:** Das Parsen von XML/JSON läuft entgegen der ursprünglichen
Idee ("Rust parst streamend mit quick-xml") komplett in TypeScript in `packages/core`
(selbstgebauter Pull-Parser, keine Runtime-Dependency) — das macht den Kern headless mit
vitest testbar, ohne eine laufende Tauri-App zu brauchen. Rust hat aktuell **kein**
XML-Parsing (kein `quick-xml` in `Cargo.toml`). Performance wurde real mit einer 184-MB-Datei
verifiziert (~8s Parse-Zeit, siehe `docs/status.md` AP2) — für den aktuellen Bedarf
ausreichend; ein nativer Rust-Parser bliebe eine spätere Optimierungsoption, falls größere
Dateien das erfordern.

## Leitprinzipien

1. **Geparster Baum ist die einzige Wahrheit.** Kein paralleles Datenmodell; React leitet bei jedem
   Render frisch aus `JaxelDocument` ab (revision-getriggert).
2. **Jede Mutation läuft als Command** über den `CommandBus` (`packages/core/src/commands`).
   Ein sichtbarer Nutzerschritt = ein Undo-Schritt (ggf. als Composite).
3. **Minimal-invasives Speichern:** unveränderte Knoten behalten ihren Original-Bytebereich
   (`DocNode.byteRange`); nur geänderte Knoten werden neu serialisiert. Kein hartes
   Byte-Identität-Invariant (Unterschied zu xdp-designer) — siehe `entscheidungen.md` #1.
4. **Logik React-frei und headless testbar.** `*.ts` in `packages/core` getrennt von `*.tsx` in `apps/editor`.
5. **Ein gemeinsames Baummodell für XML und JSON** (`DocNode`), damit beide Formate in derselben
   Baumkomponente praktisch identisch dargestellt werden. Mapping-Regeln: `entscheidungen.md` #4.

## Große Dateien (mehrere 100 MB)

Rust parst streamend (quick-xml) und baut einen Index aus Byte-Offsets; das Frontend rendert die
Baumansicht virtualisiert (nur sichtbare Zeilen im DOM). Kein Editieren von Dateien größer als der
verfügbare RAM (bewusste Entscheidung, siehe `entscheidungen.md` #3).

## Wo finde ich was?

- Modellkern, Tests: `packages/core/`
- UI, Tauri-App: `apps/editor/`
- Entscheidungslog: `docs/entscheidungen.md`
- Ist-Stand je Arbeitspaket: `docs/status.md`
- Benutzerhandbuch: `docs/benutzerhandbuch.md`
- Ursprünglicher Plan (Grilling-Ergebnis, historisch): `docs/archiv/00-kickoff-plan.md`
