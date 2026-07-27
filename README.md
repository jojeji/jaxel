# Jaxel

Plattformunabhängiger XML/JSON-Editor (Linux, Windows, optional macOS) — installierbar und portabel.
Ersatz für Easy XML Editor unter Linux.

Stack: Tauri 2 + Rust-Kern + React 18 + TypeScript + Vite. Monorepo mit npm-Workspaces:

- `packages/core` — UI-freier Modellkern (Baummodell, Undo/Redo, XML↔JSON-Mapping, Suche).
- `apps/editor` — Desktop-App (React-UI + Tauri).

## Entwicklung

```bash
npm install
npx playwright install chromium   # einmalig: Browser für die UI-Tests
npm run dev      # Tauri-Dev-Fenster (im PROJEKT-WURZELVERZEICHNIS ausführen!)
npm test         # Kern + Editor (Logik in Node, UI in echtem Chromium)
```

### Testebenen

| Ebene | Wo | Läuft in | Befehl |
|---|---|---|---|
| Modellkern | `packages/core` | Node | `npm test` |
| Logik (React-frei) | `apps/editor/src/**/*.test.ts` | Node | `npm test` |
| UI (Komponenten) | `apps/editor/src/**/*.test.tsx` | headless Chromium | `npm test` |
| Referenzbilder | `apps/editor/src/**/*.visual.test.tsx` | headless Chromium | `npm run test:visual` (in `apps/editor`) |

Referenzbilder laufen bewusst getrennt und nicht in der CI: ihr Ergebnis hängt am
Schriftrendering des jeweiligen Rechners. Weicht ein Bild nach einer beabsichtigten
Design-Änderung ab, die zugehörige `.png` unter `src/__screenshots__/` löschen und
`npm run test:visual` zweimal laufen lassen — der erste Lauf legt die neue Referenz an und
schlägt absichtlich fehl, damit man sie ansieht.

**Wichtig:** `npm run dev` muss im Wurzelverzeichnis (`xml-editor/`) laufen. `apps/editor` hat ein
eigenes, gleichnamiges `"dev"`-Skript, das NUR den Vite-Server startet (kein Tauri-Fenster) — wird
die resultierende URL dann in einem normalen Browser statt im Tauri-Fenster geöffnet, schlägt jeder
`invoke()`-Aufruf mit `Cannot read properties of undefined (reading 'invoke')` fehl, weil
`window.__TAURI_INTERNALS__` dort nicht existiert. Alternative aus `apps/editor` heraus:
`npm run tauri dev`.

## Release-Build (Linux)

```bash
npm run tauri -- build --bundles appimage,deb,rpm
```

Erzeugt unter `apps/editor/src-tauri/target/release/bundle/`:

- `appimage/Jaxel_*.AppImage` — portabel, ohne Installation direkt startbar (`chmod +x`, dann
  ausführen; nimmt optional eine XML/JSON-Datei als Argument).
- `deb/Jaxel_*.deb` — für Debian/Ubuntu (`sudo apt install ./Jaxel_*.deb`).
- `rpm/Jaxel-*.rpm` — für Fedora/openSUSE.

Das `--bundles`-Flag lässt das in `tauri.conf.json` ebenfalls konfigurierte Windows-Ziel `nsis`
aus, das auf einem Linux-Host nicht baubar ist.

## VS Code

`.vscode/tasks.json` und `.vscode/launch.json` bündeln die üblichen Abläufe:
„Jaxel starten (Tauri dev)" (Start-Button / F5), „Prüfkette" (Strg+Shift+B, Tests +
Typecheck + `cargo check`), „Alle Tests" sowie die Release-Tasks für Linux
(AppImage/deb/rpm) und Windows (nsis — läuft nur auf einem echten Windows-Host).

Änderungen: siehe [CHANGELOG.md](CHANGELOG.md).

Doku: [docs/architektur.md](docs/architektur.md), [docs/entscheidungen.md](docs/entscheidungen.md),
[docs/status.md](docs/status.md), [docs/benutzerhandbuch.md](docs/benutzerhandbuch.md).
