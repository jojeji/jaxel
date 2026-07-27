import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Theme } from "./state/settings-store.js";

/**
 * Farbzusicherungen für alle Themes — der Teil der Kommentar-Darstellung, den vorher NIEMAND
 * geprüft hat: jsdom rechnet keine Styles aus, also war jede `--comment`-Zuweisung in
 * styles.css blindes Vertrauen. Diese Tests laufen im echten Browser (vite.config.ts,
 * Projekt "ui") und lesen die tatsächlich berechnete Farbe.
 *
 * Bewusst OHNE die App: dass ein Kommentarknoten die Klasse `tree-row--comment` bekommt,
 * prüft App.test.tsx bereits. Hier geht es allein darum, was diese Klasse je Theme bewirkt.
 */

const THEMES: Theme[] = ["light", "dark", "nordlicht", "tanne", "terrakotta", "kobalt", "kontrast"];

/** Relative Luminanz nach WCAG 2.1 aus einem `rgb(r, g, b)`-String, wie getComputedStyle ihn liefert. */
function luminance(color: string): number {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number) as [number, number, number];
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG-Kontrastverhältnis zweier Farben (1:1 = identisch, 21:1 = Schwarz auf Weiß). */
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function renderRows(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  render(
    <div className="tree-view" data-testid="view" style={{ background: "var(--bg-1)" }}>
      <div className="tree-row" data-testid="plain">
        <span className="tree-row__name">person</span>
      </div>
      <div className="tree-row tree-row--comment" data-testid="comment">
        <span className="tree-row__comment-marker">&lt;!--</span>
        <span className="tree-row__preview">ein Kommentar</span>
      </div>
      {/* Referenzfarbe für "gedämpft/gelöscht": die Variable, die .tree-row--tombstone
          vorsieht. Direkt statt über eine Tombstone-Zeile gemessen — deren Name holt sich
          seine Farbe aus .tree-row__name und ist deshalb kein verlässlicher Maßstab. */}
      <span data-testid="muted" style={{ color: "var(--text-2)" }}>
        gedaempft
      </span>
    </div>,
  );
}

/** Die Farbe, die ein Element tatsächlich auf den Schirm bringt. */
function colorOf(testId: string): string {
  const el = screen.getByTestId(testId);
  const painted = el.querySelector(".tree-row__preview") ?? el.querySelector(".tree-row__name") ?? el;
  return getComputedStyle(painted).color;
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe("Kommentarfarbe je Theme", () => {
  it.each(THEMES)("Theme '%s' faerbt Kommentare eigenstaendig und lesbar", (theme) => {
    renderRows(theme);

    const comment = colorOf("comment");
    const plain = colorOf("plain");
    const muted = colorOf("muted");
    // Die Zeile selbst ist transparent — der sichtbare Untergrund kommt vom Baumcontainer.
    // (Gegen `rgba(0, 0, 0, 0)` gemessen wäre jede Farbe scheinbar kontraststark.)
    const background = getComputedStyle(screen.getByTestId("view")).backgroundColor;

    // Die Korrektur des PO beim Grilling (entscheidungen.md, "Kommentare in XML" #8):
    // Kommentare brauchen einen EIGENEN Stil, sonst sind sie von gelöschten Knoten nicht zu
    // unterscheiden. Beide Abgrenzungen werden hier festgenagelt.
    expect(comment, `Theme ${theme}: Kommentar sieht aus wie ein normaler Knoten`).not.toBe(plain);
    expect(comment, `Theme ${theme}: Kommentar sieht aus wie ein geloeschter Knoten`).not.toBe(muted);

    // Lesbarkeit: 3:1 ist die WCAG-Schwelle fuer grossen/fetten Text — Kommentare stehen
    // kursiv in Baumzeilen, darunter waere die Farbe im hellen Theme kaum zu entziffern.
    const ratio = contrastRatio(comment, background);
    expect(ratio, `Theme ${theme}: Kommentarfarbe hat nur ${ratio.toFixed(2)}:1 Kontrast`).toBeGreaterThanOrEqual(3);
  });

  it.each(THEMES)("Theme '%s' setzt den linken Marker-Balken am Kommentar", (theme) => {
    renderRows(theme);
    // Der Balken (box-shadow inset) ist die zweite, farbunabhaengige Kennzeichnung — er traegt
    // die Information auch dort, wo Farbe allein nicht reicht.
    expect(getComputedStyle(screen.getByTestId("comment")).boxShadow).not.toBe("none");
  });

  it.each(THEMES)("Theme '%s' stellt Kommentare kursiv dar", (theme) => {
    renderRows(theme);
    expect(getComputedStyle(screen.getByTestId("comment")).fontStyle).toBe("italic");
  });
});
