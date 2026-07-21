import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/index.js";
import { ReloadDialog } from "./ReloadDialog.js";

beforeEach(() => localStorage.setItem("jaxel.locale", "de"));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderDialog(isDirty: boolean, onKeepMine = vi.fn(), onReload = vi.fn()) {
  const result = render(
    <I18nProvider>
      <ReloadDialog fileName="sample.xml" isDirty={isDirty} onReload={onReload} onKeepMine={onKeepMine} />
    </I18nProvider>,
  );
  return { ...result, onKeepMine, onReload };
}

describe("ReloadDialog", () => {
  it("ignoriert einen Klick auf den Hintergrund", async () => {
    const user = userEvent.setup();
    const { container, onKeepMine, onReload } = renderDialog(false);

    await user.click(container.querySelector(".settings-overlay")!);

    expect(onKeepMine).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("wertet Escape als 'Meine Version behalten'", async () => {
    const user = userEvent.setup();
    const { onKeepMine, onReload } = renderDialog(false);

    await user.keyboard("{Escape}");

    expect(onKeepMine).toHaveBeenCalledOnce();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("fokussiert bei sauberem Dokument 'Neu laden' und markiert es als primär", () => {
    renderDialog(false);
    const reload = screen.getByRole("button", { name: "Neu laden" });
    const keepMine = screen.getByRole("button", { name: "Meine Version behalten" });

    expect(document.activeElement).toBe(reload);
    expect(reload).toHaveClass("primary");
    expect(keepMine).not.toHaveClass("primary");
  });

  it("fokussiert bei eigenen Änderungen 'Meine Version behalten' und markiert es als primär", () => {
    renderDialog(true);
    const reload = screen.getByRole("button", { name: "Neu laden" });
    const keepMine = screen.getByRole("button", { name: "Meine Version behalten" });

    expect(document.activeElement).toBe(keepMine);
    expect(keepMine).toHaveClass("primary");
    expect(reload).not.toHaveClass("primary");
  });

  it("hält Tab und Shift+Tab zwischen den beiden Aktionen", async () => {
    const user = userEvent.setup();
    renderDialog(false);
    const reload = screen.getByRole("button", { name: "Neu laden" });
    const keepMine = screen.getByRole("button", { name: "Meine Version behalten" });

    await user.tab();
    expect(document.activeElement).toBe(keepMine);
    await user.tab();
    expect(document.activeElement).toBe(reload);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(keepMine);
  });

  it("stellt nach der Entscheidung den vorherigen Fokus wieder her", async () => {
    const user = userEvent.setup();

    function Harness(): React.ReactElement {
      const [open, setOpen] = useState(false);
      return (
        <I18nProvider>
          <button onClick={() => setOpen(true)}>Dialog öffnen</button>
          {open && (
            <ReloadDialog
              fileName="sample.xml"
              isDirty={false}
              onReload={() => setOpen(false)}
              onKeepMine={() => setOpen(false)}
            />
          )}
        </I18nProvider>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Dialog öffnen" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Meine Version behalten" }));

    expect(document.activeElement).toBe(opener);
  });
});
