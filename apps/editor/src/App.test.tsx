import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { App } from "./App.js";
import { I18nProvider } from "./i18n/index.js";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

// jsdom has no ResizeObserver; TreeView only needs it to know the viewport height for
// virtualization, and the tests here use small trees that fit well within the fallback
// overscan window even with viewportHeight stuck at 0.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <person id="P-1">
    <name>Anna</name>
    <city>Berlin</city>
  </person>
  <person id="P-2">
    <name>Bert</name>
    <city>Hamburg</city>
  </person>
</catalog>`;

beforeEach(() => {
  localStorage.setItem("jaxel.locale", "de");
  vi.mocked(invoke).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
    if (cmd === "take_pending_open_paths") return [];
    if (cmd === "read_text_file") return { content: SAMPLE_XML, encoding: "UTF-8" };
    if (cmd === "write_text_file") return undefined;
    throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
  });
  vi.mocked(open).mockResolvedValue("/fake/sample.xml");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

async function openSampleFile() {
  const user = userEvent.setup();
  renderApp();
  const openButtons = screen.getAllByRole("button", { name: "Datei öffnen…" });
  await user.click(openButtons[0]!);
  await screen.findByText("catalog");
  return user;
}

describe("Datei öffnen und Baumdarstellung", () => {
  it("öffnet eine Datei und zeigt den Baum an", async () => {
    await openSampleFile();
    expect(screen.getByText("catalog")).toBeInTheDocument();
    expect(screen.getAllByText("person")).toHaveLength(2);
  });

  it("zeigt beim Klick invoke-Fehler als Banner statt stumm zu scheitern", async () => {
    vi.mocked(open).mockRejectedValueOnce(new Error("Dialog-Fehler"));
    const user = userEvent.setup();
    renderApp();
    const openButtons = screen.getAllByRole("button", { name: "Datei öffnen…" });
    await user.click(openButtons[0]!);
    expect(await screen.findByText("Dialog-Fehler")).toBeInTheDocument();
  });
});

describe("Auswahl und Attribute-Panel", () => {
  it("zeigt beim Auswählen eines Knotens dessen Attribute im Seitenpanel", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    expect(screen.getByText("Attribute")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();
  });

  it("zeigt 'Kein Knoten ausgewählt' ohne Auswahl", async () => {
    await openSampleFile();
    expect(screen.getByText("Kein Knoten ausgewählt")).toBeInTheDocument();
  });
});

describe("Umbenennen (Klick auf Namen / F2)", () => {
  it("zweiter Klick auf den bereits ausgewählten Namen aktiviert Umbenennen; Enter uebernimmt", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // 1. Klick: auswaehlen
    await user.click(screen.getAllByText("person")[0]!); // 2. Klick: umbenennen
    const input = screen.getByDisplayValue("person");
    await user.clear(input);
    await user.type(input, "human");
    await user.keyboard("{Enter}");
    expect(screen.queryByDisplayValue("person")).not.toBeInTheDocument();
    // "human" also shows up in the (still-selected) attributes panel's node-name display —
    // scope to the tree row specifically to avoid an ambiguous multi-match.
    expect(screen.getByText("human", { selector: ".tree-row__name" })).toBeInTheDocument();
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(1);
  });

  it("Escape bricht das Umbenennen ohne Aenderung ab", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    await user.click(screen.getAllByText("person")[0]!);
    const input = screen.getByDisplayValue("person");
    await user.clear(input);
    await user.type(input, "human");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("human")).not.toBeInTheDocument();
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
  });

  it("F2 aktiviert Umbenennen fuer den ausgewaehlten Knoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "F2" });
    expect(screen.getByDisplayValue("catalog")).toBeInTheDocument();
  });
});

describe("Wert editieren (Doppelklick) und Undo/Redo", () => {
  async function expandFirstPerson(user: ReturnType<typeof userEvent.setup>) {
    const twisties = screen.getAllByText("▸");
    await user.click(twisties[0]!);
    return screen.findByText("Berlin");
  }

  it("Doppelklick auf einen Blattwert editiert ihn, Blur uebernimmt", async () => {
    const user = await openSampleFile();
    const cityValue = await expandFirstPerson(user);
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    fireEvent.blur(input);
    expect(await screen.findByText("München")).toBeInTheDocument();
    expect(screen.queryByText("Berlin")).not.toBeInTheDocument();
  });

  it("Strg+Z macht die letzte Bearbeitung rueckgaengig, Strg+Y stellt sie wieder her", async () => {
    const user = await openSampleFile();
    const cityValue = await expandFirstPerson(user);
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(await screen.findByText("Berlin")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(await screen.findByText("München")).toBeInTheDocument();
  });
});

describe("Attribute hinzufuegen/aendern/entfernen", () => {
  it("aendert einen bestehenden Attributwert live im Baum", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    const idInput = screen.getByDisplayValue("P-1");
    await user.clear(idInput);
    await user.type(idInput, "P-99");
    expect(await screen.findByText('id="P-99"')).toBeInTheDocument();
  });

  it("fuegt ein neues Attribut hinzu und entfernt es wieder", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    await user.type(screen.getByPlaceholderText("Name"), "role");
    await user.type(screen.getByPlaceholderText("Wert"), "admin");
    await user.click(screen.getByTitle("Attribut hinzufügen"));
    expect(await screen.findByText(/role="admin"/)).toBeInTheDocument();

    const removeButtons = screen.getAllByTitle("Attribut entfernen");
    await user.click(removeButtons[removeButtons.length - 1]!);
    expect(screen.queryByText(/role="admin"/)).not.toBeInTheDocument();
    expect(screen.getByText(/id="P-1"/)).toBeInTheDocument();
  });
});

describe("Knoten einfuegen/loeschen", () => {
  it("'Kind hinzufuegen' fuegt einen Knoten ein, 'Loeschen' entfernt den ausgewaehlten Knoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    await user.click(screen.getByRole("button", { name: "Kind hinzufügen" }));
    const newNodes = await screen.findAllByText("node");
    expect(newNodes).toHaveLength(1);

    await user.click(newNodes[0]!);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    expect(screen.queryByText("node")).not.toBeInTheDocument();
  });
});
