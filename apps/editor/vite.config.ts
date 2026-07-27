import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
// defineConfig aus vitest/config statt aus vite: nur diese Variante kennt den `test`-Block.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Tauri lädt das Frontend aus dem Bundle — relative Asset-Pfade funktionieren
  // dort und auf jedem Webserver-Unterpfad.
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    // Zwei Projekte entlang der Grenze, die das Projekt ohnehin zieht (CLAUDE.md): *.ts ist
    // React-freie Logik und läuft in Node, *.tsx rendert UI und läuft in einem echten Browser.
    // jsdom fällt damit ganz weg — es kennt weder CSS noch Layout noch ResizeObserver, und
    // genau diese drei Lücken sollen die UI-Tests schließen.
    projects: [
      {
        extends: true,
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          include: ["src/**/*.test.tsx"],
          // Referenzbilder haengen am Schriftrendering des jeweiligen Rechners und laufen
          // deshalb separat (npm run test:visual), nicht im normalen Testlauf.
          exclude: ["src/**/*.visual.test.tsx"],
          setupFiles: ["./src/test-setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "visual",
          include: ["src/**/*.visual.test.tsx"],
          setupFiles: ["./src/test-setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
            // Sonst landen bei jedem Fehlschlag zusaetzliche Bilder neben den Referenzen
            // im selben Ordner — dort soll nur stehen, was auch Referenz ist.
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
