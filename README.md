<p align="center">
  <img src="apps/editor/src-tauri/icons/128x128.png" alt="Jaxel-Logo" width="96" height="96">
</p>

<h1 align="center">Jaxel</h1>

<p align="center">
  Plattformunabhängiger Desktop-Editor für XML und JSON — beide Formate in derselben kompakten Baumansicht.
</p>

<p align="center">
  <a href="https://github.com/jojeji/jaxel/releases/latest"><img alt="Neueste Version" src="https://img.shields.io/github/v/release/jojeji/jaxel?label=Version"></a>
  <a href="https://github.com/jojeji/jaxel/actions/workflows/release.yml"><img alt="Release-Build" src="https://github.com/jojeji/jaxel/actions/workflows/release.yml/badge.svg"></a>
</p>

---

## Was ist Jaxel?

Jaxel ist ein Editor für technische Nutzer, die große XML- und JSON-Dateien schnell durchsuchen,
gezielt bearbeiten und Knotenpfade kopieren müssen. Er entstand als Ersatz für den Easy XML Editor,
der unter Linux nicht läuft, und ist für Linux und Windows gebaut.

Jaxel zeigt XML und JSON im selben Baum, speichert XML **minimal-invasiv** (unveränderte Bereiche
der Datei bleiben byte-genau erhalten) und bleibt auch bei Dateien mit mehreren hundert Megabyte
bedienbar.

## Funktionen

- **Ein Baum für XML und JSON**: Elemente, Attribute, Werte und Kommentare in einer kompakten,
  virtualisierten Baumansicht; mehrere Dokumente in Tabs.
- **Bearbeiten**: Namen, Werte und Attribute direkt im Baum ändern; Knoten anlegen, duplizieren,
  löschen, per Drag&Drop verschieben, kopieren und einfügen (auch mehrere auf einmal).
  Rückgängig/Wiederholen für jeden Schritt.
- **Kommentare (XML)**: Knoten aus- und wieder einkommentieren; auskommentierte Bereiche werden als
  Baum angezeigt.
- **Suchen, Ersetzen, Filtern**: nach Namen, Werten oder Attributen, optional mit regulären
  Ausdrücken; „Alle ersetzen“ als ein Rückgängig-Schritt; Suche auf einen Teilbaum begrenzbar.
- **Fokus-Ansicht**: einen Teilbaum als eigenen Tab öffnen.
- **Pfad kopieren**: den Pfad eines Knotens (z. B. `catalog.person[0].name`) in die Zwischenablage.
- **XML ↔ JSON umwandeln**: über „Speichern unter“ mit der Endung des anderen Formats.
- **Base64-Inhalte**: eingebettete Base64-Daten (z. B. PDFs) erkennen und anzeigen.
- **Schutz vor Datenverlust**: Nachfrage bei ungespeicherten Änderungen, Erkennung von Änderungen
  anderer Programme an offenen Dateien.
- **Kodierungen**: UTF-8 und UTF-16 (mit und ohne BOM), ISO-8859-1/Windows-1252 über die
  XML-Deklaration oder automatisch erkannt; beim Speichern bleibt die Kodierung der Datei erhalten.
- **Oberfläche** auf Deutsch und Englisch, mehrere Farbschemata (hell, dunkel, Kontrast u. a.).

Bewusst **nicht** enthalten: XSD-/DTD-Validierung.

Die vollständige Bedienung beschreibt das [Benutzerhandbuch](docs/benutzerhandbuch.md).

## Varianten

| Variante | Plattform | Installation nötig | Datei im Release |
|---|---|---|---|
| **AppImage** | Linux (x86_64) | nein, portabel | `Jaxel_<version>_amd64.AppImage` |
| **Debian-Paket** | Debian, Ubuntu und Derivate | ja | `Jaxel_<version>_amd64.deb` |
| **RPM-Paket** | Fedora, openSUSE, RHEL und Derivate | ja | `Jaxel-<version>-1.x86_64.rpm` |
| **Installer** | Windows 10/11 (x64) | ja | `Jaxel_<version>_x64-setup.exe` |
| **Portable** | Windows 10/11 (x64) | nein, portabel | `Jaxel_<version>_x64-portable.zip` |
| **VS-Code-Einbettung** | überall, wo VS Code läuft | über eine Extension | nicht Teil der Releases |

macOS-Builds gibt es derzeit nicht.

## Installation

Alle Pakete liegen unter **[Releases](https://github.com/jojeji/jaxel/releases/latest)**.

### Linux

**AppImage (portabel):** herunterladen, ausführbar machen und starten. Es wird nichts installiert.

```bash
chmod +x Jaxel_*_amd64.AppImage
./Jaxel_*_amd64.AppImage                # optional mit Datei: ./Jaxel_*.AppImage daten.xml
```

**Debian/Ubuntu:**

```bash
sudo apt install ./Jaxel_*_amd64.deb
```

**Fedora/openSUSE:**

```bash
sudo dnf install ./Jaxel-*.x86_64.rpm      # openSUSE: sudo zypper install ./Jaxel-*.x86_64.rpm
```

Nur mit dem `.deb`- oder `.rpm`-Paket wird Jaxel für `.xml`, `.json` und `.ext` im
„Öffnen mit“-Menü des Dateimanagers registriert. Gegebenenfalls einmal ab- und wieder anmelden,
damit der Dateimanager die Liste neu einliest.

### Windows

**Installer:** `Jaxel_*_x64-setup.exe` ausführen. Jaxel erscheint danach im Startmenü und ist
für XML- und JSON-Dateien als Programm registriert.

**Portable:** `Jaxel_*_x64-portable.zip` an einen beliebigen Ort (auch einen USB-Stick) entpacken
und `jaxel-portable.exe` starten. Der Namenszusatz `-portable` schaltet den portablen Modus ein:
Einstellungen, WebView-Daten und Logdatei liegen im selben Ordner wie die `.exe`. Ist dieser
Ordner schreibgeschützt, nutzt Jaxel für die Sitzung den normalen AppData-Pfad und weist darauf hin.

Jaxel nutzt unter Windows die Microsoft Edge WebView2 Runtime. Unter Windows 10 und 11 ist sie
normalerweise vorhanden; der Installer richtet sie bei Bedarf ein, die portable Variante setzt sie
voraus.

### VS Code

Die Editor-Oberfläche lässt sich als WebView in eine VS-Code-Extension einbetten. Dateiöffnung,
Speichern, Backups und der Ungespeichert-Status liegen dann bei VS Code; XML- und JSON-Dateien werden
dabei **nicht** automatisch Jaxel zugeordnet, sondern über „Öffnen mit…“ gewählt. Die Extension
selbst ist nicht Teil dieses Repositorys.

## Benutzung

- Dateien öffnen: Toolbar, `Strg+O`, Drag&Drop aufs Fenster oder die Liste der zuletzt geöffneten
  Dateien auf dem Startscreen.
- Kommandozeile: `jaxel a.xml b.json` öffnet jede Datei in einem eigenen Tab. Läuft Jaxel schon,
  landen die Dateien als neue Tabs im laufenden Fenster.
- Bei der Endung `.ext` erkennt Jaxel XML oder JSON am Inhalt.

Tastenkürzel, Suche, Umwandlung und alle Einstellungen: siehe
[Benutzerhandbuch](docs/benutzerhandbuch.md).

## Entwicklung

### Voraussetzungen

- Node.js 20 und npm
- Rust (stable) und die [Tauri-2-Voraussetzungen](https://v2.tauri.app/start/prerequisites/)
  der jeweiligen Plattform; unter Debian/Ubuntu:
  `sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

### Aufbau

Monorepo mit npm-Workspaces; Stack: Tauri 2, Rust, React 18, TypeScript, Vite.

- `packages/core` — UI-freier Modellkern: Baummodell, Commands mit Undo/Redo, XML- und
  JSON-Import/Export, XML↔JSON-Umwandlung, Suche.
- `apps/editor` — Desktop-App: React-Oberfläche und Tauri-Hülle (`src-tauri`, Datei-I/O und
  Kodierungserkennung in Rust).

### Starten und testen

```bash
npm install
npx playwright install chromium   # einmalig: Browser für die UI-Tests
npm run dev                       # Tauri-Dev-Fenster (im Wurzelverzeichnis ausführen!)
npm test                          # Kern + Editor (Logik in Node, UI in echtem Chromium)
npm run typecheck
```

**Wichtig:** `npm run dev` muss im Wurzelverzeichnis des Repositorys laufen. `apps/editor` hat ein
eigenes, gleichnamiges `"dev"`-Skript, das NUR den Vite-Server startet (kein Tauri-Fenster). Wird
die resultierende URL dann in einem normalen Browser statt im Tauri-Fenster geöffnet, schlägt jeder
`invoke()`-Aufruf mit `Cannot read properties of undefined (reading 'invoke')` fehl, weil
`window.__TAURI_INTERNALS__` dort nicht existiert. Alternative aus `apps/editor` heraus:
`npm run tauri dev`.

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

`.vscode/tasks.json` und `.vscode/launch.json` bündeln die üblichen Abläufe:
„Jaxel starten (Tauri dev)“ (Start-Button / F5), „Prüfkette“ (Strg+Shift+B, Tests +
Typecheck + `cargo check`), „Alle Tests“ sowie die Release-Tasks für Linux und Windows.

### Lokal bauen

```bash
npm run tauri -- build --bundles appimage,deb,rpm    # Linux
npm run tauri -- build --bundles nsis                # Windows (nur auf einem Windows-Host)
```

Die Pakete landen unter `apps/editor/src-tauri/target/release/bundle/`.

### Release veröffentlichen

Releases baut GitHub Actions ([`release.yml`](.github/workflows/release.yml)):

1. Version in `package.json` **und** `apps/editor/src-tauri/tauri.conf.json` anheben und die
   Einträge in [CHANGELOG.md](CHANGELOG.md) unter die neue Version schieben.
2. Tag `v<version>` pushen (z. B. `git tag v0.9.0 && git push origin v0.9.0`).

Der Workflow testet, prüft, dass Tag und beide Versionsangaben übereinstimmen, baut Linux- und
Windows-Pakete samt portablem ZIP und legt das GitHub-Release an. Ein manueller Start
(„Run workflow“) baut nur und stellt die Pakete als Workflow-Artefakte bereit.

## Dokumentation

- [Benutzerhandbuch](docs/benutzerhandbuch.md): Bedienung aus Nutzersicht
- [Architektur](docs/architektur.md): Ein-Seiten-Landkarte des Codes
- [Entscheidungen](docs/entscheidungen.md): Entscheidungslog, maßgeblich bei Widersprüchen
- [Status](docs/status.md): Stand je Arbeitspaket
- [CHANGELOG](CHANGELOG.md): Änderungen je Version
- [CLAUDE.md](CLAUDE.md): Arbeitsanweisung für KI-Agenten in diesem Repository

## Lizenz

Für dieses Repository ist noch keine Lizenz festgelegt.
