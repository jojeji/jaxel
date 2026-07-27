import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { page } from "@vitest/browser/context";
import type { Theme } from "./state/settings-store.js";

/**
 * Referenzbilder je Theme — die Ebene, die theme-colors.test.tsx NICHT abdeckt: dort werden
 * einzelne Farben gemessen, hier zählt der Gesamteindruck (Abstände, Marker-Balken, Kursive,
 * Zusammenspiel der Zeilenarten).
 *
 * Läuft NICHT im normalen `npm test`, sondern über `npm run test:visual` (eigenes Projekt in
 * vite.config.ts). Grund: Schriftrendering hängt an den installierten Fonts des Rechners, ein
 * Referenzbild aus der Entwicklungsumgebung würde auf einem CI-Runner zwangsläufig abweichen —
 * das wären rote Builds ohne echten Befund.
 */

const THEMES: Theme[] = ["light", "dark", "nordlicht", "tanne", "terrakotta", "kobalt", "kontrast"];

/** Zeilenhoehe der Baumdarstellung — ROW_HEIGHT aus TreeView.tsx. */
const ROW_HEIGHT = 22;

interface SampleRow {
  className: string;
  depth: number;
  marker?: string;
  name?: string;
  attrs?: string;
  preview?: string;
}

/** Zeilenarten untereinander — genau die Unterscheidung, um die es beim Grilling ging. */
const ROWS: SampleRow[] = [
  { className: "", depth: 0, name: "catalog", preview: "(4)" },
  { className: "", depth: 1, name: "person", attrs: 'id="P-1"' },
  { className: "tree-row--comment", depth: 1, marker: "<!--", preview: "Stand: Juli 2026, noch zu pruefen" },
  { className: "tree-row--comment", depth: 1, marker: "<!--", preview: '<person id="P-3">' },
  { className: "tree-row--in-comment", depth: 2, name: "name", preview: "Clara" },
  { className: "tree-row--tombstone", depth: 1, name: "person", preview: "(2)" },
];

function TreeSample(): React.ReactElement {
  return (
    // .tree-row ist absolut positioniert (Virtualisierung) — ohne `top` je Zeile und eine
    // Höhe am Container fallen alle Zeilen aufeinander und das Bild zeigt einen Streifen.
    <div
      className="tree-view"
      style={{ background: "var(--bg-1)", width: 420, height: ROWS.length * ROW_HEIGHT, position: "relative" }}
    >
      {ROWS.map((row, index) => (
        <div
          key={index}
          className={`tree-row ${row.className}`.trim()}
          style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, paddingLeft: row.depth * 16 }}
        >
          {row.marker !== undefined && <span className="tree-row__comment-marker">{row.marker}</span>}
          {row.name !== undefined && <span className="tree-row__name">{row.name}</span>}
          {row.attrs !== undefined && <span className="tree-row__attrs">{row.attrs}</span>}
          {row.preview !== undefined && <span className="tree-row__preview">{row.preview}</span>}
        </div>
      ))}
    </div>
  );
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe("Referenzbilder je Theme", () => {
  it.each(THEMES)("Theme '%s'", async (theme) => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(<TreeSample />);
    await expect
      .element(page.elementLocator(container.firstElementChild as HTMLElement))
      .toMatchScreenshot(`baum-${theme}`);
  });
});
