# Jaxel

Plattformunabhängiger XML/JSON-Editor (Linux, Windows, optional macOS) — installierbar und portabel.
Ersatz für Easy XML Editor unter Linux.

Stack: Tauri 2 + Rust-Kern + React 18 + TypeScript + Vite. Monorepo mit npm-Workspaces:

- `packages/core` — UI-freier Modellkern (Baummodell, Undo/Redo, XML↔JSON-Mapping, Suche).
- `apps/editor` — Desktop-App (React-UI + Tauri).

## Entwicklung

```bash
npm install
npm run dev      # Tauri-Dev-Fenster (im PROJEKT-WURZELVERZEICHNIS ausführen!)
npm test         # vitest im Kern-Paket
```

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

Doku: [docs/architektur.md](docs/architektur.md), [docs/entscheidungen.md](docs/entscheidungen.md),
[docs/status.md](docs/status.md), [docs/benutzerhandbuch.md](docs/benutzerhandbuch.md).
