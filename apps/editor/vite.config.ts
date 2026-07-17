import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});
