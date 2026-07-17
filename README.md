# Jaxel

Plattformunabhängiger XML/JSON-Editor (Linux, Windows, optional macOS) — installierbar und portabel.
Ersatz für Easy XML Editor unter Linux.

Stack: Tauri 2 + Rust-Kern + React 18 + TypeScript + Vite. Monorepo mit npm-Workspaces:

- `packages/core` — UI-freier Modellkern (Baummodell, Undo/Redo, XML↔JSON-Mapping, Suche).
- `apps/editor` — Desktop-App (React-UI + Tauri).

## Entwicklung

```bash
npm install
npm run dev      # Tauri-Dev-Fenster
npm test         # vitest im Kern-Paket
```

Doku: [docs/architektur.md](docs/architektur.md), [docs/entscheidungen.md](docs/entscheidungen.md),
[docs/status.md](docs/status.md), [docs/benutzerhandbuch.md](docs/benutzerhandbuch.md).
