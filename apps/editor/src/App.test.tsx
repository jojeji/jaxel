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

const SECOND_XML = `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <item id="I-1">
    <label>Schraube</label>
  </item>
</inventory>`;

const FILES: Record<string, string> = {
  "/fake/sample.xml": SAMPLE_XML,
  "/fake/second.xml": SECOND_XML,
};

const writeText = vi.fn().mockResolvedValue(undefined);
const readText = vi.fn().mockResolvedValue("");

beforeEach(() => {
  localStorage.setItem("jaxel.locale", "de");
  vi.mocked(invoke).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
    if (cmd === "take_pending_open_paths") return [];
    if (cmd === "read_text_file") {
      const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
      return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8" };
    }
    if (cmd === "write_text_file") return undefined;
    throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
  });
  vi.mocked(open).mockResolvedValue("/fake/sample.xml");
  writeText.mockClear();
  readText.mockClear();
  readText.mockResolvedValue("");
});

/**
 * @testing-library/user-event's `setup()` installs its OWN clipboard stub on
 * `navigator.clipboard` (via a getter, unconditionally — see its Clipboard.js), which runs
 * AFTER our beforeEach and would silently shadow a mock installed there. Call this AFTER
 * `openSampleFile()` (which calls `userEvent.setup()` internally) in any test that asserts
 * on clipboard reads/writes.
 */
function stubClipboard(): void {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText, readText },
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme; // App writes this directly on document.documentElement
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

  it("Startscreen: Klick auf einen 'Zuletzt geöffnet'-Eintrag oeffnet die Datei", async () => {
    localStorage.setItem("jaxel.recentFiles", JSON.stringify(["/fake/second.xml"]));
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByText("Zuletzt geöffnet")).toBeInTheDocument();
    expect(screen.getByText("Tastenkürzel")).toBeInTheDocument();

    await user.click(screen.getByText("second.xml"));
    expect(await screen.findByText("inventory")).toBeInTheDocument();
  });

  it("merkt sich den letzten Ordner und startet den Dialog dort", async () => {
    const user = await openSampleFile();
    expect(localStorage.getItem("jaxel.lastDir")).toBe("/fake");
    expect(JSON.parse(localStorage.getItem("jaxel.recentFiles")!)).toEqual(["/fake/sample.xml"]);

    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    expect(vi.mocked(open).mock.calls.at(-1)![0]).toMatchObject({ defaultPath: "/fake" });
  });
});

describe("Auswahl, Auf-/Zuklappen per Klick und Attribute-Panel", () => {
  it("Klick auf einen Container selektiert UND klappt ihn auf, zweiter Klick zu", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    // person P-1 ist jetzt aufgeklappt: Kinder sichtbar, Attribute-Panel zeigt die Auswahl.
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();

    await user.click(screen.getAllByText("person")[0]!);
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  it("zeigt 'Kein Knoten ausgewählt' ohne Auswahl", async () => {
    await openSampleFile();
    expect(screen.getByText("Kein Knoten ausgewählt")).toBeInTheDocument();
  });
});

describe("Umbenennen (Doppelklick auf Namen / F2)", () => {
  it("Doppelklick auf den Namen aktiviert Umbenennen; Enter uebernimmt", async () => {
    const user = await openSampleFile();
    await user.dblClick(screen.getAllByText("person")[0]!);
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
    await user.dblClick(screen.getAllByText("person")[0]!);
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

describe("Wert editieren (Doppelklick / Enter) und Undo/Redo", () => {
  async function expandFirstPerson(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByText("person")[0]!);
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

  it("Enter editiert den Wert des ausgewaehlten Blattknotens", async () => {
    const user = await openSampleFile();
    const cityValue = await expandFirstPerson(user);
    await user.click(cityValue); // selektiert die city-Zeile
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByDisplayValue("Berlin")).toBeInTheDocument();
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

describe("Pfeiltasten-Navigation", () => {
  it("Auf/Ab bewegt die Auswahl durch sichtbare Zeilen", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog")); // selektiert + klappt zu
    fireEvent.keyDown(window, { key: "ArrowRight" }); // wieder aufklappen
    fireEvent.keyDown(window, { key: "ArrowDown" }); // -> person P-1
    expect(screen.getByText("person", { selector: ".attributes-panel__node-name" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowDown" }); // -> person P-2
    expect(screen.getByDisplayValue("P-2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowUp" }); // -> zurueck zu P-1
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();
  });

  it("Rechts klappt auf bzw. geht ins erste Kind, Links klappt zu bzw. geht zum Elternknoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // selektiert + expandiert P-1
    await screen.findByText("Anna");

    fireEvent.keyDown(window, { key: "ArrowRight" }); // bereits offen -> erstes Kind ("name")
    expect(screen.getByText("name", { selector: ".attributes-panel__node-name" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" }); // Blatt -> zurueck zum Elternknoten
    expect(screen.getByText("person", { selector: ".attributes-panel__node-name" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" }); // offener Container -> zuklappen
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
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

describe("Knoten einfuegen/loeschen/duplizieren", () => {
  it("'Kind hinzufuegen' springt direkt in die Namens-Eingabe; 'Loeschen' entfernt den Knoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    await user.click(screen.getByRole("button", { name: "Kind hinzufügen" }));

    // Der neue Knoten steht sofort im Namens-Editor (vorbelegt mit "node").
    const input = screen.getByDisplayValue("node");
    await user.clear(input);
    await user.type(input, "extra");
    await user.keyboard("{Enter}");
    const created = await screen.findByText("extra", { selector: ".tree-row__name" });

    await user.click(created);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    expect(screen.queryByText("extra")).not.toBeInTheDocument();
  });

  it("Strg+Plus legt ein Kind an und startet die Namens-Eingabe", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
    expect(screen.getByDisplayValue("node")).toBeInTheDocument();
  });

  it("Strg+D dupliziert den ausgewaehlten Knoten samt Unterbaum als naechstes Geschwister", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(3);
    expect(screen.getAllByText(/id="P-1"/)).toHaveLength(2);

    // EIN Undo-Schritt entfernt das Duplikat wieder.
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
  });
});

describe("Knoten kopieren/einfuegen ueber die System-Zwischenablage", () => {
  it("Strg+C serialisiert den Knoten als XML-Fragment in die Zwischenablage", async () => {
    const user = await openSampleFile();
    stubClipboard();
    await user.click(screen.getAllByText("person")[0]!);
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]![0] as string;
    expect(copied).toContain('<person id="P-1">');
    expect(copied).toContain("<city>Berlin</city>");
  });

  it("Strg+V parst die Zwischenablage und fuegt sie als naechstes Geschwister ein", async () => {
    const user = await openSampleFile();
    stubClipboard();
    readText.mockResolvedValue('<extra flag="x"><sub>1</sub></extra>');
    await user.click(screen.getAllByText("person")[0]!);
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    expect(await screen.findByText("extra", { selector: ".tree-row__name" })).toBeInTheDocument();
    expect(screen.getByText('flag="x"')).toBeInTheDocument();
  });

  it("ungueltiger Zwischenablage-Inhalt zeigt eine Fehlermeldung statt einzufuegen", async () => {
    const user = await openSampleFile();
    stubClipboard();
    readText.mockResolvedValue("kein xml <<<");
    await user.click(screen.getAllByText("person")[0]!);
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    expect(
      await screen.findByText("Zwischenablage enthält kein gültiges, benanntes Fragment"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
  });
});

describe("Suchen und Ersetzen (Panel unten)", () => {
  it("findet einen Wert-Treffer, expandiert den Baum automatisch und selektiert ihn", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "berlin");
    await user.click(screen.getByRole("button", { name: "Finden" }));

    expect(await screen.findByText("1/1")).toBeInTheDocument();
    // "city" saß in einem eingeklappten person-Knoten -- der Treffer muss ihn automatisch aufklappen.
    expect(await screen.findByText("Berlin", { selector: ".tree-row__preview" })).toBeInTheDocument();
    expect(screen.getByText("city", { selector: ".attributes-panel__node-name" })).toBeInTheDocument();
  });

  it("zeigt die Treffer als klickbare Liste; Klick springt zum Knoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    // Zwei Ergebniszeilen mit indiziertem Pfad; Klick auf die zweite selektiert P-2.
    const second = screen.getByText("person[1]", { selector: ".search-panel__result-path" });
    await user.click(second);
    expect(screen.getByDisplayValue("P-2")).toBeInTheDocument();
    expect(await screen.findByText("2/2")).toBeInTheDocument();
  });

  it("'Weiter'/'Zurück' navigiert zyklisch zwischen mehreren Treffern", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(await screen.findByText("2/2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Weiter" })); // wraps around
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(await screen.findByText("2/2")).toBeInTheDocument();
  });

  it("Filtermodus reduziert den Baum auf Treffer + Vorfahren", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "Berlin");
    await user.click(screen.getByRole("checkbox", { name: "Filtern" }));
    await user.click(screen.getByRole("button", { name: "Finden" }));

    // Sichtbar: catalog (Vorfahre), person P-1 (Vorfahre), city (Treffer) — sonst nichts.
    expect(await screen.findByText("Berlin", { selector: ".tree-row__preview" })).toBeInTheDocument();
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(1);
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.queryByText("Hamburg")).not.toBeInTheDocument();

    // Filter-Haken raus -> voller Baum wieder da (person P-2 wieder sichtbar).
    await user.click(screen.getByRole("checkbox", { name: "Filtern" }));
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
  });

  it("'Alle ersetzen' aendert den Wert live und ist mit Strg+Z als EIN Schritt rueckgaengig machbar", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "Anna");
    await user.type(screen.getByPlaceholderText("Ersetzen durch…"), "Anne");
    await user.click(screen.getByRole("button", { name: "Alle ersetzen" }));
    expect(await screen.findByText(/1 Ersetzung/)).toBeInTheDocument();

    await user.click(screen.getAllByText("person")[0]!);
    expect(await screen.findByText("Anne")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(await screen.findByText("Anna")).toBeInTheDocument();
  });
});

describe("Pfad kopieren", () => {
  it("kopiert den indizierten und den statischen Pfad des ausgewaehlten Knotens in die Zwischenablage", async () => {
    const user = await openSampleFile();
    stubClipboard();
    await user.click(screen.getAllByText("person")[1]!); // zweiten person-Knoten (id="P-2") aufklappen
    const cityValue = await screen.findByText("Hamburg");
    await user.click(cityValue); // selektiert die "city"-Zeile

    await user.click(screen.getByRole("button", { name: "Pfad kopieren" }));
    expect(writeText).toHaveBeenCalledWith("person[1].city");
    expect(await screen.findByText("Pfad kopiert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pfad kopieren (statisch)" }));
    expect(writeText).toHaveBeenCalledWith("person.city");
  });
});

describe("Tabs (mehrere Dokumente)", () => {
  it("oeffnet ein zweites Dokument als weiteren Tab und aktiviert ihn", async () => {
    const user = await openSampleFile();
    expect(screen.getByText("catalog")).toBeInTheDocument();

    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    expect(await screen.findByText("inventory")).toBeInTheDocument();

    // Beide Tabs existieren, das zweite Dokument ist aktiv (Titelleiste zeigt seinen Pfad).
    expect(screen.getByText("sample.xml")).toBeInTheDocument();
    expect(screen.getByText("second.xml")).toBeInTheDocument();
    expect(screen.getByText("/fake/second.xml")).toBeInTheDocument();
  });

  it("Klick auf einen Tab wechselt das angezeigte Dokument", async () => {
    const user = await openSampleFile();
    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");

    await user.click(screen.getByText("sample.xml"));
    expect(await screen.findByText("catalog")).toBeInTheDocument();
    expect(screen.queryByText("inventory")).not.toBeInTheDocument();
  });

  it("Tab schliessen entfernt das Dokument und aktiviert den Nachbar-Tab", async () => {
    const user = await openSampleFile();
    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");

    await user.click(screen.getByTitle("/fake/second.xml").querySelector(".tab__close")!);
    expect(screen.queryByText("second.xml")).not.toBeInTheDocument();
    expect(await screen.findByText("catalog")).toBeInTheDocument();
  });
});

describe("Einstellungen", () => {
  it("oeffnet den Dialog, wechselt das Theme und persistiert es", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    expect(screen.getByText("Einstellungen", { selector: "h2" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined(); // hell = Default, kein Attribut

    await user.click(screen.getByRole("radio", { name: "Dunkel" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(JSON.parse(localStorage.getItem("jaxel.settings")!)).toMatchObject({ theme: "dark" });

    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByText("Einstellungen", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("die 'eigene Fenster'-Option ist sichtbar, aber deaktiviert", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    const windowsOption = screen.getByRole("radio", { name: /Als eigene Fenster/ });
    expect(windowsOption).toBeDisabled();
  });

  it("die Filter-Unterbaum-Option wird persistiert", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Unterbaum/ }));
    expect(JSON.parse(localStorage.getItem("jaxel.settings")!)).toMatchObject({
      filterIncludesSubtree: true,
    });
  });
});
