import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/index.js";
import { SourceView } from "./SourceView.js";

afterEach(cleanup);

function renderView(text: string, jumpToLine: number | null = null) {
  return render(
    <I18nProvider>
      <div style={{ height: 400, display: "flex" }}>
        <SourceView text={text} format="xml" jumpToLine={jumpToLine} onCopyAll={vi.fn()} />
      </div>
    </I18nProvider>,
  );
}

describe("SourceView", () => {
  it("rendert bei 200 000 Zeilen nur einen Ausschnitt mit Puffer", () => {
    const text = Array.from({ length: 200_000 }, (_, i) => `<z n="${i}"/>`).join("\n");
    renderView(text);
    const rows = document.querySelectorAll(".source-row");
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.length).toBeLessThan(100);
    expect(screen.getByText(/^200000 /)).toBeInTheDocument();
  });

  it("springt zur gewünschten Zeile und markiert sie", () => {
    const text = Array.from({ length: 5000 }, (_, i) => `<z n="${i}"/>`).join("\n");
    renderView(text, 4000);
    const target = document.querySelector(".source-row--target");
    expect(target?.getAttribute("data-line")).toBe("4001");
    expect(target?.textContent).toContain('n="4000"');
  });

  it("teilt eine sehr lange Zeile auf mehrere Anzeigezeilen, die Nummer steht nur in der ersten", () => {
    renderView(`<a>${"x".repeat(5000)}</a>\n<b/>`);
    const gutters = Array.from(document.querySelectorAll(".source-row__gutter")).map((el) => el.textContent);
    expect(gutters).toEqual(["1", "", "", "2"]);
  });
});
