import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { parseXml } from "@jaxel/core";
import { App } from "./App.js";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { I18nProvider } from "./i18n/index.js";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn() }));

/** Captures the App's onCloseRequested handler so tests can simulate a window close. */
const windowMock = vi.hoisted(() => ({
  closeHandlers: [] as Array<(event: { preventDefault: () => void }) => void>,
  destroy: vi.fn(),
}));
/** Captures event listeners (z. B. jaxel://pending-open-paths) zum Simulieren im Test. */
const eventMock = vi.hoisted(() => ({
  listeners: new Map<string, () => void>(),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: async (name: string, handler: () => void) => {
    eventMock.listeners.set(name, handler);
    return () => {};
  },
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: async (handler: (event: { preventDefault: () => void }) => void) => {
      windowMock.closeHandlers.push(handler);
      return () => {};
    },
    destroy: windowMock.destroy,
  }),
}));

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

const B64_XML_PAYLOAD = `<hello>${"x".repeat(60)}</hello>`;
const B64_XML = Buffer.from(B64_XML_PAYLOAD).toString("base64");
const B64_PDF = Buffer.from(`%PDF-1.7\n${"y".repeat(60)}`).toString("base64");
const B64_ATTR_PAYLOAD = `Nur Text im Attribut: ${"z".repeat(50)}`;
const B64_ATTR = Buffer.from(B64_ATTR_PAYLOAD).toString("base64");

const BLOB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<vol>
  <textblob>${B64_XML}</textblob>
  <pdfblob>${B64_PDF}</pdfblob>
  <meta hash="${B64_ATTR}"></meta>
</vol>`;

const NAMESPACED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:rsm" xmlns:ram="urn:ram">
  <ram:ExchangedDocument>
    <ram:ID>INV-1</ram:ID>
  </ram:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

const FILES: Record<string, string> = {
  "/fake/sample.xml": SAMPLE_XML,
  "/fake/second.xml": SECOND_XML,
  "/fake/blob.xml": BLOB_XML,
  "/fake/namespaced.xml": NAMESPACED_XML,
};

const writeText = vi.fn().mockResolvedValue(undefined);
const readText = vi.fn().mockResolvedValue("");

beforeEach(() => {
  localStorage.setItem("jaxel.locale", "de");
  vi.mocked(invoke).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(save).mockReset();
  vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
    if (cmd === "take_pending_open_paths") return [];
    if (cmd === "read_text_file") {
      const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
      return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
    }
    if (cmd === "write_text_file") return { mtimeMs: 1000, size: 100 };
    if (cmd === "stat_file") return { mtimeMs: 1000, size: 100 };
    if (cmd === "open_decoded_file") {
      const ext = (args as { extension?: string } | undefined)?.extension ?? "bin";
      return `/tmp/jaxel-decoded-1.${ext}`;
    }
    if (cmd === "open_log") return "/fake/logs/Jaxel.log";
    if (cmd === "log_frontend") return undefined;
    throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
  });
  vi.mocked(open).mockResolvedValue("/fake/sample.xml");
  eventMock.listeners.clear();
  windowMock.closeHandlers.length = 0;
  windowMock.destroy.mockClear();
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

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
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

  it("legt ein Attribut SOFORT beim Tippen an (kein '+' mehr) und entfernt es wieder", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);

    // Erster Buchstabe im Namensfeld erzeugt das Attribut sofort sichtbar im Baum …
    await user.type(screen.getByPlaceholderText("Name"), "r");
    expect(await screen.findByText(/\br=""/)).toBeInTheDocument();
    // … der Fokus springt in die neue Zeile, dort wird weitergetippt.
    await user.keyboard("ole");
    expect(await screen.findByText(/role=""/)).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "role" }), "admin");
    expect(await screen.findByText(/role="admin"/)).toBeInTheDocument();

    // Die ganze Namens-Tippkette (anlegen + 3 weitere Buchstaben) ist EIN Undo-Schritt:
    fireEvent.keyDown(window, { key: "z", ctrlKey: true }); // Wert-Tippkette weg
    fireEvent.keyDown(window, { key: "z", ctrlKey: true }); // Attribut komplett weg
    expect(screen.queryByText(/role/)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(await screen.findByText(/role="admin"/)).toBeInTheDocument();

    const removeButtons = screen.getAllByTitle("Attribut entfernen");
    await user.click(removeButtons[removeButtons.length - 1]!);
    expect(screen.queryByText(/role="admin"/)).not.toBeInTheDocument();
    expect(screen.getByText(/id="P-1"/)).toBeInTheDocument();
  });

  it("Attributnamen sind editierbar (live, als ein Undo-Schritt)", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    const nameInput = screen.getByDisplayValue("id");
    await user.clear(nameInput);
    await user.type(nameInput, "key");
    expect(await screen.findByText(/key="P-1"/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(await screen.findByText(/id="P-1"/)).toBeInTheDocument();
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

  it("Strg+Plus auf der Wurzel legt ein Kind an (keine Geschwister-Ebene möglich)", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
    expect(screen.getByDisplayValue("node")).toBeInTheDocument();
  });

  it("Strg+Shift+Plus auf der Wurzel legt ebenfalls ein Kind an", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true, shiftKey: true });
    expect(screen.getByDisplayValue("node")).toBeInTheDocument();
  });

  it("Strg+Plus (ohne Shift) fügt bei einem Nicht-Wurzel-Knoten ein Geschwister ein, nicht ein Kind", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // aufklappen
    await user.click(screen.getByText("Anna")); // Blattknoten "name" auswählen
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
    const input = screen.getByDisplayValue("node");
    await user.clear(input);
    await user.type(input, "extra");
    await user.keyboard("{Enter}");

    const extraRow = screen.getByText("extra", { selector: ".tree-row__name" }).closest(".tree-row") as HTMLElement;
    const nameRow = screen.getByText("name", { selector: ".tree-row__name" }).closest(".tree-row") as HTMLElement;
    expect(extraRow.style.paddingLeft).toBe(nameRow.style.paddingLeft); // gleiche Ebene wie "name"/"city"
  });

  it("Strg+Shift+Plus fügt bei einem Nicht-Wurzel-Knoten ein Kind eine Ebene tiefer ein", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // aufklappen
    await user.click(screen.getByText("Anna")); // Blattknoten "name" auswählen
    fireEvent.keyDown(window, { key: "+", ctrlKey: true, shiftKey: true });
    const input = screen.getByDisplayValue("node");
    await user.clear(input);
    await user.type(input, "extra");
    await user.keyboard("{Enter}");

    const extraRow = screen.getByText("extra", { selector: ".tree-row__name" }).closest(".tree-row") as HTMLElement;
    const nameRow = screen.getByText("name", { selector: ".tree-row__name" }).closest(".tree-row") as HTMLElement;
    expect(parseInt(extraRow.style.paddingLeft, 10)).toBe(parseInt(nameRow.style.paddingLeft, 10) + 16);
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
  it("Strg+F öffnet und fokussiert die Suche auch aus einem normalen Textfeld", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    const attributeValue = screen.getByDisplayValue("P-1");
    attributeValue.focus();

    fireEvent.keyDown(attributeValue, { key: "f", ctrlKey: true });

    const query = await screen.findByPlaceholderText("Suchbegriff…");
    await waitFor(() => expect(document.activeElement).toBe(query));
  });

  it("erneutes Cmd+F erhält Suchzustand und Treffer und markiert den ganzen Suchtext", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    const query = screen.getByPlaceholderText("Suchbegriff…") as HTMLInputElement;
    await user.type(query, "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();
    screen.getByPlaceholderText("Ersetzen durch…").focus();

    fireEvent.keyDown(document.activeElement!, { key: "f", metaKey: true });

    await waitFor(() => expect(document.activeElement).toBe(query));
    expect(query).toHaveValue("person");
    expect(query.selectionStart).toBe(0);
    expect(query.selectionEnd).toBe("person".length);
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("Strg+F übergeht keinen modalen Dialog", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    const setting = screen.getByRole("checkbox", { name: /Automatisch neu laden/ });
    setting.focus();

    const notCanceled = fireEvent.keyDown(setting, { key: "f", ctrlKey: true });

    expect(notCanceled).toBe(false);
    expect(document.activeElement).toBe(setting);
    expect(screen.getByText("Einstellungen", { selector: "h2" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Suchbegriff…")).not.toBeInTheDocument();
  });

  it("Strg+F bleibt ohne geöffnetes Dokument wirkungslos", () => {
    renderApp();

    fireEvent.keyDown(window, { key: "f", ctrlKey: true });

    expect(screen.queryByPlaceholderText("Suchbegriff…")).not.toBeInTheDocument();
  });

  it("Strg+F lässt auch einen modalen Dialog auf dem Startscreen unberührt", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Neues Dokument" })[0]!);
    const xmlButton = screen.getByRole("button", { name: "XML" });
    xmlButton.focus();

    const notCanceled = fireEvent.keyDown(xmlButton, { key: "f", ctrlKey: true });

    expect(notCanceled).toBe(false);
    expect(document.activeElement).toBe(xmlButton);
    expect(screen.queryByPlaceholderText("Suchbegriff…")).not.toBeInTheDocument();
  });

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

  it("'Nur im ausgewaehlten Unterbaum' beschraenkt die Suche auf den selektierten Knoten", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // selektiert + expandiert P-1

    await user.click(screen.getByRole("button", { name: "Suchen" }));
    const checkbox = screen.getByRole("checkbox", { name: "Nur im ausgewählten Unterbaum" });
    expect(checkbox).not.toBeDisabled(); // ein Knoten ist ausgewaehlt

    await user.click(checkbox);
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "city");
    await user.click(screen.getByRole("button", { name: "Finden" }));

    // Ohne Unterbaum-Beschraenkung gaebe es zwei "city"-Treffer (P-1 und P-2); mit
    // Beschraenkung auf den selektierten P-1-Unterbaum nur einer.
    expect(await screen.findByText("1/1")).toBeInTheDocument();

    await user.click(checkbox); // Haken raus -> wieder das gesamte Dokument
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();
  });

  it("'Nur im ausgewaehlten Unterbaum' ist ohne Auswahl deaktiviert", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    expect(screen.getByRole("checkbox", { name: "Nur im ausgewählten Unterbaum" })).toBeDisabled();
  });

  it("Tab-Wechsel setzt das Suchpanel zurueck (kein Absturz durch Treffer des alten Dokuments)", async () => {
    // Regression: XML oeffnen, suchen, dann zweites Dokument oeffnen fuehrte zu
    // "computePaths: node ... is not root ..." weil die Ergebnisliste alte Knoten
    // gegen die neue Wurzel aufloeste.
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    expect(await screen.findByText("inventory")).toBeInTheDocument();

    // Panel ist zurueckgesetzt: keine alten Treffer, leeres Suchfeld.
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Suchbegriff…")).toHaveValue("");
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

  it("'Alle ersetzen' auf mehreren Knoten-Namen gleichzeitig ist ebenfalls mit Strg+Z rueckgaengig machbar", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "person");
    await user.selectOptions(screen.getByRole("combobox"), "name");
    await user.type(screen.getByPlaceholderText("Ersetzen durch…"), "human");
    await user.click(screen.getByRole("button", { name: "Alle ersetzen" }));
    expect(await screen.findByText(/2 Ersetzung/)).toBeInTheDocument();
    expect(screen.getAllByText("human", { selector: ".tree-row__name" })).toHaveLength(2);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(await screen.findAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
  });

  it("'Alle ersetzen' mit Regex kombiniert mit 'Nur im ausgewaehlten Unterbaum' ist ebenfalls rueckgaengig machbar", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // P-1 selektieren + aufklappen
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.click(screen.getByRole("checkbox", { name: "Nur im ausgewählten Unterbaum" }));
    await user.click(screen.getByRole("checkbox", { name: "Regex" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "^Ber.*$");
    await user.type(screen.getByPlaceholderText("Ersetzen durch…"), "Muenchen");
    await user.click(screen.getByRole("button", { name: "Alle ersetzen" }));
    expect(await screen.findByText(/1 Ersetzung/)).toBeInTheDocument();
    expect(await screen.findByText("Muenchen", { selector: ".tree-row__preview" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(await screen.findByText("Berlin", { selector: ".tree-row__preview" })).toBeInTheDocument();
  });

  it("Pfeil hoch/runter bewegt nur die Markierung in der Trefferliste, Enter springt erst dann zum Treffer", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    const query = screen.getByPlaceholderText("Suchbegriff…");
    await user.type(query, "person");
    await user.keyboard("{Enter}"); // erstes Enter: frische Suche, springt sofort zu Treffer 1
    expect(await screen.findByText("1/2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    expect(await screen.findByText("2/2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument(); // Baum bisher unveraendert

    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("P-2")).toBeInTheDocument();

    await user.keyboard("{ArrowUp}"); // wrap zurueck zu Treffer 1
    expect(await screen.findByText("1/2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-2")).toBeInTheDocument(); // weiterhin unveraendert

    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();
  });

  it("Aendern des Suchbegriffs und erneutes Enter startet eine frische Suche ab Treffer 1", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    const query = screen.getByPlaceholderText("Suchbegriff…");
    await user.type(query, "person");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("1/2")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByText("2/2")).toBeInTheDocument();

    await user.clear(query);
    await user.type(query, "berlin");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("1/1")).toBeInTheDocument();
    expect(await screen.findByText("Berlin", { selector: ".tree-row__preview" })).toBeInTheDocument();
  });

  it("Ziehen am oberen Rand des Suchpanels aendert dessen Hoehe", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    const handle = screen.getByRole("separator", { name: "Suchpanel-Höhe ändern" });
    const panel = handle.closest(".search-panel") as HTMLElement;
    const initialHeight = parseInt(panel.style.height, 10);

    fireEvent.pointerDown(handle, { clientY: 500 });
    fireEvent.pointerMove(window, { clientY: 400 }); // nach oben gezogen -> Panel wird hoeher
    fireEvent.pointerUp(window);

    expect(parseInt(panel.style.height, 10)).toBeGreaterThan(initialHeight);
  });

  it("Dock-Umschalter verschiebt die Suche in eine Sidebar-Tableiste neben Attribute; Tab-Wechsel dort erhaelt den Suchzustand", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.click(screen.getByRole("button", { name: "Suche an den rechten Rand andocken" }));

    expect(screen.getByRole("tab", { name: "Attribute" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Suchen" })).toHaveAttribute("aria-selected", "true");

    const query = screen.getByPlaceholderText("Suchbegriff…");
    await user.type(query, "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    // Zur Attribute-Ansicht wechseln (Suchtab bleibt da) und wieder zurueck: Zustand erhalten.
    await user.click(screen.getByRole("tab", { name: "Attribute" }));
    expect(screen.getByPlaceholderText("Suchbegriff…")).not.toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Suchen" }));
    expect(screen.getByPlaceholderText("Suchbegriff…")).toHaveValue("person");
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("Ziehen am linken Rand der rechten Sidebar aendert deren Breite", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.click(screen.getByRole("button", { name: "Suche an den rechten Rand andocken" }));

    const handle = screen.getByRole("separator", { name: "Sidebar-Breite ändern" });
    const sidebar = handle.closest(".right-sidebar") as HTMLElement;
    const initialWidth = parseInt(sidebar.style.width, 10);

    fireEvent.pointerDown(handle, { clientX: 500 });
    fireEvent.pointerMove(window, { clientX: 400 }); // nach links gezogen -> Sidebar wird breiter
    fireEvent.pointerUp(window);

    expect(parseInt(sidebar.style.width, 10)).toBeGreaterThan(initialWidth);
  });

  it("Esc im Rechts-Dock schliesst nur den Suche-Tab (Sidebar bleibt, Suchzustand bleibt erhalten)", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.click(screen.getByRole("button", { name: "Suche an den rechten Rand andocken" }));
    const query = screen.getByPlaceholderText("Suchbegriff…");
    await user.type(query, "person");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("tab", { name: "Attribute" })).toHaveAttribute("aria-selected", "true");
    const searchTab = screen.getByRole("tab", { name: "Suchen" });
    expect(searchTab).toBeInTheDocument();

    await user.click(searchTab);
    expect(screen.getByPlaceholderText("Suchbegriff…")).toHaveValue("person");
  });

  it("Rechtsklick auf einen Suchtreffer oeffnet ein Kontextmenue mit allen 3 Pfad-Varianten", async () => {
    const user = await openSampleFile();
    stubClipboard();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "person");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/2")).toBeInTheDocument();

    const secondRow = screen.getByText("person[1]", { selector: ".search-panel__result-path" }).closest("tr")!;
    fireEvent.contextMenu(secondRow);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Pfad kopieren" }));
    expect(writeText).toHaveBeenCalledWith("person[1]");

    fireEvent.contextMenu(secondRow);
    await user.click(screen.getByRole("menuitem", { name: "Pfad kopieren (statisch)" }));
    expect(writeText).toHaveBeenCalledWith("person");

    fireEvent.contextMenu(secondRow);
    await user.click(screen.getByRole("menuitem", { name: /Vollständigen Pfad kopieren/ }));
    expect(writeText).toHaveBeenCalledWith("catalog.person");
  });

  it("blendet Namespace-Praefixe in der Trefferliste standardmaessig aus; Einstellung schaltet sie wieder ein", async () => {
    vi.mocked(open).mockResolvedValueOnce("/fake/namespaced.xml");
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText(/CrossIndustryInvoice/); // Baum zeigt den Namespace-Praefix unveraendert

    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.type(screen.getByPlaceholderText("Suchbegriff…"), "ExchangedDocument");
    await user.click(screen.getByRole("button", { name: "Finden" }));
    expect(await screen.findByText("1/1")).toBeInTheDocument();

    // Default: Namespace-Praefixe im Pfad ausgeblendet; Treffer-Text zeigt den Elementinhalt
    // (hier: Kindanzahl, da ExchangedDocument selbst keinen Textwert hat).
    expect(screen.getByText("ExchangedDocument", { selector: ".search-panel__result-path" })).toBeInTheDocument();
    expect(screen.getByText("(1)", { selector: ".search-panel__result-text" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: "Namespace-Präfixe in der Trefferliste anzeigen" }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    expect(
      screen.getByText("ram:ExchangedDocument", { selector: ".search-panel__result-path" }),
    ).toBeInTheDocument();
    expect(screen.getByText("(1)", { selector: ".search-panel__result-text" })).toBeInTheDocument();
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

describe("Kontextmenü und vollständiger Pfad", () => {
  it("Strg+Shift+C kopiert den vollstaendigen Pfad (mit Wurzel, ohne Indizes)", async () => {
    const user = await openSampleFile();
    stubClipboard();
    await user.click(screen.getAllByText("person")[1]!); // P-2 aufklappen + selektieren
    await user.click(await screen.findByText("Hamburg")); // city-Zeile selektieren

    fireEvent.keyDown(window, { key: "C", ctrlKey: true, shiftKey: true });
    expect(writeText).toHaveBeenCalledWith("catalog.person.city");
  });

  it("Rechtsklick selektiert die Zeile und oeffnet das Menue; 'Vollständigen Pfad kopieren' funktioniert", async () => {
    const user = await openSampleFile();
    stubClipboard();
    const personRow = screen.getAllByText("person")[0]!.closest(".tree-row")!;
    fireEvent.contextMenu(personRow);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    // Rechtsklick hat selektiert: Attribute-Panel zeigt P-1.
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /Vollständigen Pfad kopieren/ }));
    expect(writeText).toHaveBeenCalledWith("catalog.person");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("'Löschen' ist im Menue fuer die Wurzel deaktiviert, fuer andere Knoten aktiv", async () => {
    await openSampleFile();
    fireEvent.contextMenu(screen.getByText("catalog").closest(".tree-row")!);
    expect(screen.getByRole("menuitem", { name: /Löschen/ })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    expect(screen.getByRole("menuitem", { name: /Löschen/ })).toBeEnabled();
  });
});

describe("Fokus-Ansicht ab Knoten", () => {
  it("'Fokus ab hier öffnen' zeigt nur den Unterbaum in einem neuen Tab", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!); // P-1
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));

    // Neuer, aktiver Tab neben dem Datei-Tab.
    expect(await screen.findByText("person — sample.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(screen.getByText("sample.xml", { selector: ".tab__label" })).toBeInTheDocument();

    // Nur der P-1-Unterbaum ist sichtbar (automatisch aufgeklappt) — nicht "catalog" oder P-2.
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(1);
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("catalog", { selector: ".tree-row__name" })).not.toBeInTheDocument();
    expect(screen.queryByText("Bert")).not.toBeInTheDocument();

    // Breadcrumb zeigt den Pfad von der echten Wurzel bis zum Fokus-Knoten.
    expect(screen.getByText("catalog", { selector: ".focus-breadcrumb__segment" })).toBeInTheDocument();
    expect(screen.getByText("person", { selector: ".focus-breadcrumb__current" })).toBeInTheDocument();
  });

  it("ist auf dem sichtbaren Wurzelknoten deaktiviert (Vollansicht UND innerhalb einer Fokus-Ansicht)", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getByText("catalog").closest(".tree-row")!);
    expect(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });

    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));
    await screen.findByText("person — sample.xml", { selector: ".tab__label" });

    fireEvent.contextMenu(screen.getByText("person", { selector: ".tree-row__name" }).closest(".tree-row")!);
    expect(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" })).toBeDisabled();
  });

  it("Bearbeitung im Fokus-Tab wirkt auf dasselbe Dokument (geteilter CommandBus)", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));
    await screen.findByText("person — sample.xml", { selector: ".tab__label" });

    await user.dblClick(await screen.findByText("Anna"));
    const input = screen.getByDisplayValue("Anna");
    await user.clear(input);
    await user.type(input, "Annika");
    await user.keyboard("{Enter}");

    // Zurueck zur Vollansicht desselben Dokuments: die Aenderung ist da (kein Klon).
    await user.click(screen.getByText("sample.xml", { selector: ".tab__label" }));
    await user.click(screen.getAllByText("person")[0]!);
    expect(await screen.findByText("Annika")).toBeInTheDocument();
  });

  it("Klick auf die Wurzel im Breadcrumb verlaesst den Fokus (kein Duplikat-Tab)", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));
    await screen.findByText("person — sample.xml", { selector: ".tab__label" });

    await user.click(screen.getByText("catalog", { selector: ".focus-breadcrumb__segment" }));

    expect(screen.queryByText("person — sample.xml", { selector: ".tab__label" })).not.toBeInTheDocument();
    expect(await screen.findByText("catalog")).toBeInTheDocument();
    expect(screen.getAllByText("person")).toHaveLength(2);
  });

  it("Loeschen des Fokus-Knotens refokussiert automatisch eine Ebene hoeher", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));
    await screen.findByText("person — sample.xml", { selector: ".tab__label" });

    await user.click(screen.getByText("person", { selector: ".tree-row__name" }));
    fireEvent.keyDown(window, { key: "Delete" });

    // Fokus-Tab verschmilzt mit dem vorhandenen Vollansicht-Tab (kein Absturz, kein toter Tab).
    expect(screen.queryByText("person — sample.xml", { selector: ".tab__label" })).not.toBeInTheDocument();
    expect(await screen.findByText("catalog")).toBeInTheDocument();
    expect(screen.getAllByText("person")).toHaveLength(1); // nur noch P-2 uebrig
  });
});

describe("Drag&Drop im Baum", () => {
  function dragPayload() {
    return { dataTransfer: { setData: vi.fn(), effectAllowed: "", dropEffect: "" } };
  }

  it("verschiebt einen Knoten hinter ein Geschwister (Einfuege-Linie 'after')", async () => {
    await openSampleFile();
    const [p1, p2] = screen
      .getAllByText("person", { selector: ".tree-row__name" })
      .map((el) => el.closest(".tree-row")! as HTMLElement);

    fireEvent.dragStart(p1!, dragPayload());
    vi.spyOn(p2!, "getBoundingClientRect").mockReturnValue({
      top: 100, bottom: 122, height: 22, left: 0, right: 400, width: 400, x: 0, y: 100,
      toJSON: () => ({}),
    } as DOMRect);
    // jsdom kennt kein DragEvent (fireEvent.dragOver verwirft clientY daher) — MouseEvent
    // mit manuell angehaengtem dataTransfer transportiert die Y-Koordinate zuverlaessig.
    const overEvent = new MouseEvent("dragover", { bubbles: true, cancelable: true, clientY: 120 });
    Object.assign(overEvent, dragPayload());
    fireEvent(p2!, overEvent); // unteres Viertel -> "after"
    expect(document.querySelector(".tree-row--drop-after")).not.toBeNull();

    fireEvent.drop(p2!, dragPayload());
    const attrs = Array.from(document.querySelectorAll(".tree-row__attrs")).map((el) => el.textContent);
    expect(attrs).toEqual(['id="P-2"', 'id="P-1"']);

    // Ein Undo-Schritt stellt die alte Reihenfolge wieder her.
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    const attrsAfterUndo = Array.from(document.querySelectorAll(".tree-row__attrs")).map((el) => el.textContent);
    expect(attrsAfterUndo).toEqual(['id="P-1"', 'id="P-2"']);
  });

  it("legt einen Knoten AUF einer Zeile als Kind ab ('into')", async () => {
    await openSampleFile();
    const [p1, p2] = screen
      .getAllByText("person", { selector: ".tree-row__name" })
      .map((el) => el.closest(".tree-row")! as HTMLElement);

    fireEvent.dragStart(p2!, dragPayload());
    fireEvent.dragOver(p1!, { clientY: 0, ...dragPayload() }); // jsdom-Rect hat Hoehe 0 -> Mitte -> "into"
    expect(document.querySelector(".tree-row--drop-into")).not.toBeNull();

    fireEvent.drop(p1!, dragPayload());
    // P-2 haengt jetzt als drittes Kind unter P-1; P-1 wurde automatisch aufgeklappt.
    expect(await screen.findByText("(3)")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
  });

  it("verhindert das Ablegen im eigenen Unterbaum", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // P-1 aufklappen
    const p1 = screen.getAllByText("person", { selector: ".tree-row__name" })[0]!.closest(".tree-row")!;
    const cityRow = (await screen.findByText("Berlin")).closest(".tree-row")! as HTMLElement;

    fireEvent.dragStart(p1, dragPayload());
    fireEvent.dragOver(cityRow, { clientY: 0, ...dragPayload() });
    expect(document.querySelector(".tree-row--drop-into")).toBeNull();
    fireEvent.drop(cityRow, dragPayload());
    // Struktur unveraendert: P-1 hat weiterhin 2 Kinder.
    expect(screen.getAllByText("person", { selector: ".tree-row__name" })).toHaveLength(2);
    expect(screen.getByText("Anna")).toBeInTheDocument();
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

  it("behaelt den Auf-/Zuklapp-Zustand eines Tabs beim Wechseln und Zurueckkehren bei", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // klappt die erste person auf
    await screen.findByText("Berlin");

    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");

    await user.click(screen.getByText("sample.xml"));
    await screen.findByText("catalog");
    expect(screen.getByText("Berlin")).toBeInTheDocument(); // immer noch aufgeklappt, nicht kollabiert
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

describe("Über Jaxel", () => {
  it("zeigt Titel, Entwickler und einen Versions-Platzhalter (kein echtes Tauri-Fenster im Test)", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Über Jaxel" }));

    expect(screen.getByText("Jaxel", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("Joey Lauterbach")).toBeInTheDocument();
    expect(screen.getByText(/Claude/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByText("Joey Lauterbach")).not.toBeInTheDocument();
  });

  it("„Logdatei öffnen“ ruft open_log auf und zeigt den Pfad als Status", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Über Jaxel" }));
    await user.click(screen.getByRole("button", { name: "Logdatei öffnen" }));

    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "open_log")).toBe(true),
    );
    expect(await screen.findByText("Log geöffnet: /fake/logs/Jaxel.log")).toBeInTheDocument();
  });
});

describe("Absturz- und Fehler-Logging (AP15)", () => {
  function logCallsMatching(predicate: (message: string, level: string) => boolean): boolean {
    return vi.mocked(invoke).mock.calls.some(([cmd, args]) => {
      if (cmd !== "log_frontend") return false;
      const { level, message } = args as { level?: string; message?: string };
      return predicate(message ?? "", level ?? "");
    });
  }

  it("globaler window-error-Handler meldet Fehler per log_frontend", async () => {
    renderApp();
    fireEvent(window, new ErrorEvent("error", { message: "Kaputt", error: new Error("Kaputt") }));
    await waitFor(() =>
      expect(logCallsMatching((message, level) => level === "error" && message.startsWith("[onerror]"))).toBe(true),
    );
  });

  it("unhandledrejection wird per log_frontend gemeldet", async () => {
    renderApp();
    const rejectionEvent = new Event("unhandledrejection");
    Object.defineProperty(rejectionEvent, "reason", { value: new Error("Async kaputt"), configurable: true });
    fireEvent(window, rejectionEvent);
    await waitFor(() =>
      expect(logCallsMatching((message) => message.startsWith("[unhandledrejection]"))).toBe(true),
    );
  });

  it("Fehlerbanner wird zusätzlich per log_frontend geloggt", async () => {
    vi.mocked(open).mockRejectedValueOnce(new Error("Dialog-Fehler"));
    const user = userEvent.setup();
    renderApp();
    const openButtons = screen.getAllByRole("button", { name: "Datei öffnen…" });
    await user.click(openButtons[0]!);
    await screen.findByText("Dialog-Fehler");
    await waitFor(() => expect(logCallsMatching((message) => message === "[banner] Dialog-Fehler")).toBe(true));
  });

  it("Breadcrumb: Datei öffnen loggt nur den Pfad", async () => {
    await openSampleFile();
    await waitFor(() =>
      expect(
        logCallsMatching(
          (message, level) => level === "info" && message === "[breadcrumb] Datei geöffnet: /fake/sample.xml",
        ),
      ).toBe(true),
    );
  });

  it("ErrorBoundary zeigt eine Fehlerseite statt eines Weißbilds und loggt", async () => {
    function ThrowingChild(): React.ReactElement {
      throw new Error("Render kaputt");
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </I18nProvider>,
    );
    expect(await screen.findByText("Etwas ist schiefgelaufen")).toBeInTheDocument();
    await waitFor(() => expect(logCallsMatching((message) => message.startsWith("[errorboundary]"))).toBe(true));
    consoleError.mockRestore();
  });

  it("ein fehlschlagender log_frontend-Aufruf stört die App nicht (Story 15)", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "log_frontend") throw new Error("Backend nicht erreichbar");
      if (cmd === "take_pending_open_paths") return [];
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
        return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
      }
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });
    await openSampleFile();
    expect(screen.getByText("catalog")).toBeInTheDocument();
  });
});

describe("Schwebende Status- und Fehlermeldungen", () => {
  it("stapelt Fehler und Status neueste zuerst und lässt beide getrennt schließen", async () => {
    const user = await openSampleFile();
    stubClipboard();
    vi.mocked(open).mockRejectedValueOnce(new Error("Dialog-Fehler"));
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    expect(await screen.findByText("Dialog-Fehler")).toBeInTheDocument();

    await user.click(screen.getAllByText("person")[0]!);
    await user.click(screen.getByRole("button", { name: "Pfad kopieren" }));
    expect(await screen.findByText("Pfad kopiert")).toBeInTheDocument();

    const viewport = document.querySelector(".toast-viewport")!;
    expect(viewport).toBeInTheDocument();
    expect(Array.from(viewport.querySelectorAll(".toast__message"), (node) => node.textContent)).toEqual([
      "Pfad kopiert",
      "Dialog-Fehler",
    ]);
    expect(document.querySelector(".app-error")).not.toBeInTheDocument();
    expect(document.querySelector(".app-status")).not.toBeInTheDocument();

    const toasts = viewport.querySelectorAll<HTMLElement>(".toast");
    await user.click(within(toasts[0]!).getByRole("button", { name: "Meldung schließen" }));
    expect(screen.queryByText("Pfad kopiert")).not.toBeInTheDocument();
    expect(screen.getByText("Dialog-Fehler")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Meldung schließen" }));
    expect(screen.queryByText("Dialog-Fehler")).not.toBeInTheDocument();
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

  it.each([
    ["Nordlicht", "nordlicht"],
    ["Tanne", "tanne"],
    ["Terrakotta", "terrakotta"],
    ["Kobalt", "kobalt"],
    ["Kontrast", "kontrast"],
  ])("Theme '%s' setzt data-theme='%s' und persistiert es", async (label, slug) => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("radio", { name: label }));
    expect(document.documentElement.dataset.theme).toBe(slug);
    expect(JSON.parse(localStorage.getItem("jaxel.settings")!)).toMatchObject({ theme: slug });

    // Zurück zu "Hell" entfernt das Attribut wieder (Hell ist der CSS-Default ohne Attribut).
    await user.click(screen.getByRole("radio", { name: "Hell" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
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

describe("Baum-Änderungsmarker (Settings: default aus)", () => {
  async function enableChangeMarkers(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Geänderte, neue und gelöschte Knoten/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));
  }

  it("zeigt standardmäßig keine Marker an, auch nach einer Bearbeitung", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");

    expect(document.querySelector(".tree-row__change-marker")).not.toBeInTheDocument();
  });

  it("markiert einen geänderten Knoten und lässt es nach dem Speichern wieder verschwinden", async () => {
    const user = await openSampleFile();
    await enableChangeMarkers(user);

    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");

    const cityRow = screen.getByText("city", { selector: ".tree-row__name" }).closest(".tree-row")!;
    expect(cityRow.querySelector(".tree-row__change-marker--modified")).toBeInTheDocument();

    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(cityRow.querySelector(".tree-row__change-marker")).not.toBeInTheDocument());
  });

  it("markiert einen neu eingefügten Knoten als 'neu'", async () => {
    const user = await openSampleFile();
    await enableChangeMarkers(user);

    await user.click(screen.getByText("catalog"));
    await user.click(screen.getByRole("button", { name: "Kind hinzufügen" }));
    const input = screen.getByDisplayValue("node");
    await user.clear(input);
    await user.type(input, "extra");
    await user.keyboard("{Enter}");
    const created = await screen.findByText("extra", { selector: ".tree-row__name" });

    expect(created.closest(".tree-row")!.querySelector(".tree-row__change-marker--added")).toBeInTheDocument();
  });

  it("zeigt einen gelöschten Knoten als durchgestrichene Tombstone-Zeile", async () => {
    const user = await openSampleFile();
    await enableChangeMarkers(user);

    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.click(cityValue.closest(".tree-row")!);
    await user.click(screen.getByRole("button", { name: "Löschen" }));

    const tombstone = await screen.findByText("city", { selector: ".tree-row--tombstone .tree-row__name" });
    expect(tombstone.closest(".tree-row--tombstone")).toBeInTheDocument();
  });
});

describe("Neues Dokument anlegen", () => {
  it("legt ein neues XML-Dokument mit leerem <root> an und nennt den Tab 'Unbenannt-1'", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Neues Dokument" })[0]!);
    await user.click(screen.getByRole("button", { name: "XML" }));

    expect(await screen.findByText("Unbenannt-1", { selector: ".tab__label" })).toBeInTheDocument();
    expect(screen.getByText("root", { selector: ".tree-row__name" })).toBeInTheDocument();
  });

  it("Klick auf die freie Fläche der Tab-Leiste öffnet den Formatwahl-Dialog", async () => {
    const user = await openSampleFile();
    const tabBar = document.querySelector(".tab-bar")!;
    await user.click(tabBar as HTMLElement);

    expect(await screen.findByRole("button", { name: "XML" })).toBeInTheDocument();
  });

  it("Klick auf einen Tab selbst öffnet den Formatwahl-Dialog NICHT", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByText("sample.xml", { selector: ".tab__label" }));

    expect(screen.queryByRole("button", { name: "XML" })).not.toBeInTheDocument();
  });

  it("legt ein neues JSON-Dokument an ($root, da leeres Objekt)", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Neues Dokument" })[0]!);
    await user.click(screen.getByRole("button", { name: "JSON" }));

    expect(await screen.findByText("$root", { selector: ".tree-row__name" })).toBeInTheDocument();
  });

  it("Strg+S bei einem unbenannten Dokument oeffnet 'Speichern unter' und schluesselt den Tab um", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Neues Dokument" })[0]!);
    await user.click(screen.getByRole("button", { name: "XML" }));
    await screen.findByText("Unbenannt-1", { selector: ".tab__label" });

    vi.mocked(save).mockResolvedValue("/fake/neu.xml");
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "take_pending_open_paths") return [];
      if (cmd === "write_text_file") return { mtimeMs: 1000, size: 100 };
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    await user.keyboard("{Control>}s{/Control}");

    expect(await screen.findByText("neu.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(vi.mocked(invoke)).toHaveBeenCalledWith(
      "write_text_file",
      expect.objectContaining({ path: "/fake/neu.xml" }),
    );
  });

  it("Abbrechen im Speichern-unter-Dialog laesst das unbenannte Dokument unveraendert", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "Neues Dokument" })[0]!);
    await user.click(screen.getByRole("button", { name: "XML" }));
    await screen.findByText("Unbenannt-1", { selector: ".tab__label" });

    vi.mocked(save).mockResolvedValue(null); // Nutzer bricht den Dialog ab

    await user.keyboard("{Control>}s{/Control}");

    expect(screen.getByText("Unbenannt-1", { selector: ".tab__label" })).toBeInTheDocument();
  });
});

describe("Tab-Dirty-Anzeige (Punkt bei ungespeicherten Änderungen)", () => {
  function sampleTab(): HTMLElement {
    return screen.getByText("sample.xml", { selector: ".tab__label" }).closest(".tab")!;
  }

  it("markiert den Tab nach einer Bearbeitung als dirty und wieder als sauber nach dem Speichern", async () => {
    const user = await openSampleFile();
    expect(sampleTab()).not.toHaveClass("tab--dirty");

    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");

    expect(sampleTab()).toHaveClass("tab--dirty");

    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));
  });

  it("wird nach dem Speichern wieder sauber, sobald Strg+Z exakt zur Speicher-Baseline zurückgeht", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const input = screen.getByDisplayValue("Berlin");
    await user.clear(input);
    await user.type(input, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");

    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));

    const munich = await screen.findByText("München");
    await user.dblClick(munich);
    const input2 = screen.getByDisplayValue("München");
    await user.clear(input2);
    await user.type(input2, "Köln");
    await user.keyboard("{Enter}");
    await screen.findByText("Köln");
    expect(sampleTab()).toHaveClass("tab--dirty");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await screen.findByText("München");
    expect(sampleTab()).not.toHaveClass("tab--dirty");
  });

  it("zweites Speichern nach Bearbeitung eines ANDEREN Elements erzeugt kein kaputtes XML (Regression: Byte-Offsets nach dem Speichern)", async () => {
    const user = await openSampleFile();

    // Erste Bearbeitung: Annas Stadt aendern, speichern.
    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const cityInput = screen.getByDisplayValue("Berlin");
    await user.clear(cityInput);
    await user.type(cityInput, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");
    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));

    // Zweite Bearbeitung: ein ANDERES, bislang unberuehrtes Element (Berts Name), erneut speichern.
    await user.click(screen.getAllByText("person")[1]!);
    const bertValue = await screen.findByText("Bert");
    await user.dblClick(bertValue);
    const nameInput = screen.getByDisplayValue("Bert");
    await user.clear(nameInput);
    await user.type(nameInput, "Bertram");
    await user.keyboard("{Enter}");
    await screen.findByText("Bertram");
    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));

    const writes = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === "write_text_file");
    expect(writes).toHaveLength(2);
    const secondContent = (writes[1]![1] as { content: string }).content;

    // Beide Bearbeitungen enthalten, der unberuehrte Nachbar ("Hamburg") unversehrt erhalten,
    // und die Datei bleibt gueltiges XML (statt kaputt durch veraltete Byte-Offsets).
    expect(secondContent).toContain("München");
    expect(secondContent).toContain("Bertram");
    expect(secondContent).toContain("Hamburg");
    expect(() => parseXml(secondContent)).not.toThrow();
  });

  it("Bearbeiten, speichern, Strg+Z, erneut speichern schreibt wieder den URSPRUNGSWERT (Regression: Save-Epoche)", async () => {
    const user = await openSampleFile();

    await user.click(screen.getAllByText("person")[0]!);
    const cityValue = await screen.findByText("Berlin");
    await user.dblClick(cityValue);
    const cityInput = screen.getByDisplayValue("Berlin");
    await user.clear(cityInput);
    await user.type(cityInput, "München");
    await user.keyboard("{Enter}");
    await screen.findByText("München");
    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true }); // Strg+Z
    await screen.findByText("Berlin");
    await user.keyboard("{Control>}s{/Control}");
    await waitFor(() => expect(sampleTab()).not.toHaveClass("tab--dirty"));

    const writes = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === "write_text_file");
    expect(writes).toHaveLength(2);
    const secondContent = (writes[1]![1] as { content: string }).content;

    expect(secondContent).toContain("Berlin");
    expect(secondContent).not.toContain("München");
    expect(() => parseXml(secondContent)).not.toThrow();
  });
});

describe("Externe Dateiänderungen (Reload bei Fenster-Fokus)", () => {
  it("zeigt den Reload-Dialog, wenn sich mtime/Größe seit dem Laden geändert haben", async () => {
    await openSampleFile();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
        return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 };
      }
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));

    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
    expect(screen.getByText(/wurde von einem anderen Programm geändert\. Jetzt neu laden\?/)).toBeInTheDocument();
  });

  it("unveränderte mtime/Größe lösen gar nichts aus", async () => {
    await openSampleFile();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 1000, size: 100 }; // identisch zum Ladezeitpunkt
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();
  });

  it("'Neu laden' übernimmt die geänderte Datei und behält Auswahl/aufgeklappte Knoten so gut wie möglich", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // P-1 aufklappen + selektieren

    const CHANGED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <person id="P-1">
    <name>Anna</name>
    <city>München</city>
  </person>
</catalog>`;
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") return { content: CHANGED_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await user.click(await screen.findByRole("button", { name: "Neu laden" }));

    expect(await screen.findByText("München")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P-1")).toBeInTheDocument(); // P-1 blieb ausgewaehlt
    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();
  });

  it("'Meine Version behalten' verwirft die externe Änderung", async () => {
    const user = await openSampleFile();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
        return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
      }
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await user.click(await screen.findByRole("button", { name: "Meine Version behalten" }));

    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();
    expect(screen.getByText("catalog")).toBeInTheDocument(); // unveraendert, kein Reload gelaufen
  });

  it("automatisches Neuladen (Einstellung an) laedt ohne Dialog neu, wenn nichts Eigenes ungespeichert ist", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Automatisch neu laden/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") return { content: SECOND_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));

    expect(await screen.findByText("inventory")).toBeInTheDocument();
    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();
  });

  it("bei ungespeicherten Änderungen erscheint der Dialog IMMER, auch mit aktivierter Automatik", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Automatisch neu laden/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    await user.click(screen.getByText("catalog")); // Wurzel selektieren
    fireEvent.keyDown(window, { key: "+", ctrlKey: true }); // Kind einfuegen -> Dokument "dirty"

    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));

    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
    expect(screen.getByText(/gibt es hier ungespeicherte Änderungen/)).toBeInTheDocument();
  });

  it("prüft den Dirty-Stand nach der asynchronen Dateiprüfung erneut", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Automatisch neu laden/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const pendingStat = deferred<{ mtimeMs: number; size: number }>();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return pendingStat.promise;
      if (cmd === "read_text_file") return { content: SECOND_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "stat_file")).toBe(true));
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
    await act(async () => pendingStat.resolve({ mtimeMs: 2000, size: 999 }));

    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
    expect(screen.getByText(/gibt es hier ungespeicherte Änderungen/)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Meine Version behalten" }));
    expect(screen.queryByText("inventory")).not.toBeInTheDocument();
  });

  it("bricht Auto-Reload ab, wenn das Dokument während des Einlesens dirty wird", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Automatisch neu laden/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const pendingRead = deferred<{ content: string; encoding: string; mtimeMs: number; size: number }>();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") return pendingRead.promise;
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "read_text_file")).toBe(true));
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
    await act(async () =>
      pendingRead.resolve({ content: SECOND_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 }),
    );

    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
    expect(screen.getByText(/gibt es hier ungespeicherte Änderungen/)).toBeInTheDocument();
    expect(screen.getByText("catalog")).toBeInTheDocument();
    expect(screen.queryByText("inventory")).not.toBeInTheDocument();
  });

  it("verwirft Auto-Reload still, wenn während des Einlesens der Tab wechselt", async () => {
    const user = await openSampleFile();
    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");
    await user.click(screen.getByText("sample.xml", { selector: ".tab__label" }));
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    await user.click(screen.getByRole("checkbox", { name: /Automatisch neu laden/ }));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const pendingRead = deferred<{ content: string; encoding: string; mtimeMs: number; size: number }>();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "read_text_file") return pendingRead.promise;
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "read_text_file")).toBe(true));
    await user.click(screen.getByText("second.xml", { selector: ".tab__label" }));
    await act(async () =>
      pendingRead.resolve({ content: SECOND_XML, encoding: "UTF-8", mtimeMs: 2000, size: 999 }),
    );

    await waitFor(() => expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument());
    expect(screen.getByText("inventory")).toBeInTheDocument();
  });

  it("ignoriert ein Prüfergebnis, wenn inzwischen ein anderes Dokument aktiv ist", async () => {
    const user = await openSampleFile();
    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");
    await user.click(screen.getByText("sample.xml", { selector: ".tab__label" }));

    const pendingStat = deferred<{ mtimeMs: number; size: number }>();
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return pendingStat.promise;
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "stat_file")).toBe(true));
    await user.click(screen.getByText("second.xml", { selector: ".tab__label" }));
    await act(async () => pendingStat.resolve({ mtimeMs: 2000, size: 999 }));

    await waitFor(() => expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument());
    expect(screen.getByText("inventory")).toBeInTheDocument();
  });

  it("merkt die externe Änderung vor, solange ein anderer Dialog offen ist", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { mtimeMs: 2000, size: 999 };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "stat_file")).toBe(true));

    expect(screen.getByText("Einstellungen", { selector: "h2" })).toBeInTheDocument();
    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
  });

  it("quittiert beim Behalten den neuesten Dateistand und meldet erst spätere Änderungen erneut", async () => {
    const user = await openSampleFile();
    let diskStat = { mtimeMs: 2000, size: 200 };
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") return { ...diskStat };
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();

    diskStat = { mtimeMs: 3000, size: 300 };
    await user.click(screen.getByRole("button", { name: "Meine Version behalten" }));
    await waitFor(() => expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument());

    fireEvent(window, new Event("focus"));
    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === "stat_file")).toHaveLength(3),
    );
    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();

    diskStat = { mtimeMs: 4000, size: 400 };
    fireEvent(window, new Event("focus"));
    expect(await screen.findByText("Datei wurde extern geändert")).toBeInTheDocument();
  });

  it("startet bei wiederholtem Behalten nur eine Quittierungsprüfung", async () => {
    const user = await openSampleFile();
    const pendingKeepStat = deferred<{ mtimeMs: number; size: number }>();
    let statCalls = 0;
    vi.mocked(invoke).mockImplementation(async (cmd: unknown) => {
      if (cmd === "stat_file") {
        statCalls += 1;
        return statCalls === 1 ? { mtimeMs: 2000, size: 200 } : pendingKeepStat.promise;
      }
      if (cmd === "take_pending_open_paths") return [];
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    fireEvent(window, new Event("focus"));
    const keepMine = await screen.findByRole("button", { name: "Meine Version behalten" });
    fireEvent.click(keepMine);
    fireEvent.click(keepMine);

    expect(statCalls).toBe(2); // Fokusprüfung + genau eine Quittierungsprüfung
    await act(async () => pendingKeepStat.resolve({ mtimeMs: 3000, size: 300 }));
    await waitFor(() => expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument());
  });
});

describe("Ungespeicherte Änderungen beim Schließen", () => {
  /** Selektiert die Wurzel und fügt per Strg+Plus ein Kind ein — Dokument wird "dirty". */
  async function makeDirty(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true });
  }

  it("Tab schließen mit ungespeicherten Änderungen zeigt den Dialog; Abbrechen behält den Tab", async () => {
    const user = await openSampleFile();
    await makeDirty(user);

    await user.click(screen.getByTitle("Tab schließen"));
    expect(await screen.findByText("Ungespeicherte Änderungen")).toBeInTheDocument();
    expect(screen.getByText(/„sample.xml“ hat ungespeicherte Änderungen/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByText("Ungespeicherte Änderungen")).not.toBeInTheDocument();
    expect(screen.getByText("catalog")).toBeInTheDocument();
  });

  it("„Nicht speichern“ schließt den Tab, ohne zu speichern", async () => {
    const user = await openSampleFile();
    await makeDirty(user);

    await user.click(screen.getByTitle("Tab schließen"));
    await user.click(await screen.findByRole("button", { name: "Nicht speichern" }));

    expect(screen.queryByText("catalog")).not.toBeInTheDocument();
    expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "write_text_file")).toBe(false);
  });

  it("„Speichern“ speichert und schließt den Tab danach", async () => {
    const user = await openSampleFile();
    await makeDirty(user);

    await user.click(screen.getByTitle("Tab schließen"));
    // "Speichern" existiert auch als Toolbar-Button — nur im Dialog klicken.
    const dialog = (await screen.findByText("Ungespeicherte Änderungen")).closest(".settings-dialog")!;
    await user.click(within(dialog as HTMLElement).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "write_text_file")).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText("catalog")).not.toBeInTheDocument());
  });

  it("Tab ohne Änderungen schließt ohne Dialog", async () => {
    const user = await openSampleFile();
    await user.click(screen.getByTitle("Tab schließen"));
    expect(screen.queryByText("Ungespeicherte Änderungen")).not.toBeInTheDocument();
    expect(screen.queryByText("catalog")).not.toBeInTheDocument();
  });

  it("Fokus-Tab schließen fragt nicht, solange die Vollansicht das Dokument offen hält", async () => {
    const user = await openSampleFile();
    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Fokus ab hier öffnen" }));
    await screen.findByText("person — sample.xml", { selector: ".tab__label" });

    await user.click(screen.getByText("person", { selector: ".tree-row__name" }));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true }); // dirty (geteilter CommandBus)

    const closeButtons = screen.getAllByTitle("Tab schließen");
    await user.click(closeButtons[1]!); // der Fokus-Tab

    expect(screen.queryByText("Ungespeicherte Änderungen")).not.toBeInTheDocument();
    expect(screen.getByText("catalog", { selector: ".tree-row__name" })).toBeInTheDocument();
  });

  it("Fenster schließen mit ungespeicherten Änderungen wird abgefangen; „Nicht speichern“ zerstört das Fenster", async () => {
    const user = await openSampleFile();
    await makeDirty(user);
    await waitFor(() => expect(windowMock.closeHandlers).toHaveLength(1));

    const event = { preventDefault: vi.fn() };
    act(() => windowMock.closeHandlers.forEach((handler) => handler(event)));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(await screen.findByText("Ungespeicherte Änderungen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nicht speichern" }));
    await waitFor(() => expect(windowMock.destroy).toHaveBeenCalled());
  });

  it("Fenster schließen ohne ungespeicherte Änderungen läuft ungehindert durch", async () => {
    await openSampleFile();
    await waitFor(() => expect(windowMock.closeHandlers).toHaveLength(1));

    const event = { preventDefault: vi.fn() };
    act(() => windowMock.closeHandlers.forEach((handler) => handler(event)));

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByText("Ungespeicherte Änderungen")).not.toBeInTheDocument();
  });

  it("„Alle speichern“ beim Fenster-Schließen speichert jedes geänderte Dokument und zerstört dann das Fenster", async () => {
    const user = await openSampleFile();
    await makeDirty(user);

    vi.mocked(open).mockResolvedValueOnce("/fake/second.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("inventory");
    await user.click(screen.getByText("inventory"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true }); // zweites Dokument dirty

    await waitFor(() => expect(windowMock.closeHandlers).toHaveLength(1));
    const event = { preventDefault: vi.fn() };
    act(() => windowMock.closeHandlers.forEach((handler) => handler(event)));

    expect(await screen.findByText(/2 Dokumente haben ungespeicherte Änderungen/)).toBeInTheDocument();
    expect(screen.getByText("sample.xml", { selector: ".close-dialog__files li" })).toBeInTheDocument();
    expect(screen.getByText("second.xml", { selector: ".close-dialog__files li" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alle speichern" }));

    await waitFor(() => {
      const writes = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === "write_text_file");
      expect(writes.map(([, args]) => (args as { path: string }).path).sort()).toEqual([
        "/fake/sample.xml",
        "/fake/second.xml",
      ]);
    });
    await waitFor(() => expect(windowMock.destroy).toHaveBeenCalled());
  });
});

describe("Base64-Decode-Ansicht", () => {
  async function openBlobFile() {
    const user = userEvent.setup();
    renderApp();
    vi.mocked(open).mockResolvedValueOnce("/fake/blob.xml");
    await user.click(screen.getAllByRole("button", { name: "Datei öffnen…" })[0]!);
    await screen.findByText("vol");
    return user;
  }

  it("zeigt Badges an Base64-Zeilen; Klick auf Text-Inhalt öffnet die Vorschau, daraus wird ein neuer Tab", async () => {
    const user = await openBlobFile();

    const badges = screen.getAllByText("base64", { selector: ".tree-row__base64" });
    expect(badges.length).toBeGreaterThanOrEqual(2); // textblob + pdfblob

    await user.click(badges[0]!); // textblob → dekodierter XML-Text
    expect(await screen.findByText("Dekodierter Base64-Inhalt")).toBeInTheDocument();
    expect(screen.getByText(/x{60}/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Als neuen Tab öffnen" }));
    expect(await screen.findByText("Unbenannt-1", { selector: ".tab__label" })).toBeInTheDocument();
    expect(screen.getByText("hello", { selector: ".tree-row__name" })).toBeInTheDocument();
  });

  it("Binärinhalt (PDF) wird per open_decoded_file extern geöffnet, mit Statusmeldung", async () => {
    const user = await openBlobFile();

    const badges = screen.getAllByText("base64", { selector: ".tree-row__base64" });
    await user.click(badges[1]!); // pdfblob

    await waitFor(() => {
      const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === "open_decoded_file");
      expect(call).toBeDefined();
      expect((call![1] as { extension: string }).extension).toBe("pdf");
    });
    expect(await screen.findByText(/Dekodierter Inhalt geöffnet: \/tmp\/jaxel-decoded-1\.pdf/)).toBeInTheDocument();
    expect(screen.queryByText("Dekodierter Base64-Inhalt")).not.toBeInTheDocument(); // kein Dialog
  });

  it("Attribut mit Base64-Wert bekommt im Attribute-Panel ein Badge", async () => {
    const user = await openBlobFile();
    await user.click(screen.getByText("meta"));

    const panel = document.querySelector(".attributes-panel")!;
    await user.click(within(panel as HTMLElement).getByText("base64"));

    expect(await screen.findByText("Dekodierter Base64-Inhalt")).toBeInTheDocument();
    expect(screen.getByText(/Nur Text im Attribut/)).toBeInTheDocument();
    // Freitext ist weder XML noch JSON — kein "Als neuen Tab öffnen".
    expect(screen.queryByRole("button", { name: "Als neuen Tab öffnen" })).not.toBeInTheDocument();
  });

  it("Kontextmenü-Fallback: ungültiges Base64 zeigt eine Fehlermeldung, Container sind deaktiviert", async () => {
    const user = await openSampleFile();
    await user.click(screen.getAllByText("person")[0]!); // aufklappen, damit "Berlin" sichtbar ist

    fireEvent.contextMenu((await screen.findByText("Berlin")).closest(".tree-row")!);
    await user.click(screen.getByRole("menuitem", { name: "Als Base64 dekodieren" }));
    expect(await screen.findByText("Der Wert ist kein gültiges Base64")).toBeInTheDocument();

    fireEvent.contextMenu(screen.getAllByText("person")[0]!.closest(".tree-row")!);
    expect(screen.getByRole("menuitem", { name: "Als Base64 dekodieren" })).toBeDisabled();
  });

  it("kurze Werte bekommen KEIN Badge (Mindestlänge der Heuristik)", async () => {
    await openSampleFile();
    expect(screen.queryByText("base64", { selector: ".tree-row__base64" })).not.toBeInTheDocument();
  });
});

describe("Sitzung wiederherstellen", () => {
  it("öffnet die Tabs der letzten Sitzung beim Start und aktiviert den gemerkten Tab", async () => {
    localStorage.setItem(
      "jaxel.session",
      JSON.stringify({ paths: ["/fake/sample.xml", "/fake/second.xml"], activePath: "/fake/sample.xml" }),
    );
    renderApp();

    expect(await screen.findByText("sample.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(await screen.findByText("second.xml", { selector: ".tab__label" })).toBeInTheDocument();
    // Der gemerkte aktive Tab (sample.xml) zeigt seinen Baum, nicht der zuletzt geöffnete.
    expect(await screen.findByText("catalog")).toBeInTheDocument();
    expect(screen.queryByText("inventory")).not.toBeInTheDocument();
  });

  it("stellt nichts wieder her, wenn die Einstellung deaktiviert ist", async () => {
    localStorage.setItem("jaxel.settings", JSON.stringify({ restoreSession: false }));
    localStorage.setItem("jaxel.session", JSON.stringify({ paths: ["/fake/sample.xml"], activePath: null }));
    renderApp();

    expect(await screen.findByText("Datei öffnen…")).toBeInTheDocument(); // Startscreen
    expect(screen.queryByText("sample.xml", { selector: ".tab__label" })).not.toBeInTheDocument();
  });

  it("merkt sich geöffnete Dateien in der Sitzung", async () => {
    await openSampleFile();
    await waitFor(() => {
      const session = JSON.parse(localStorage.getItem("jaxel.session") ?? "{}") as { paths?: string[] };
      expect(session.paths).toEqual(["/fake/sample.xml"]);
    });
  });

  it("überspringt verschwundene Dateien still und öffnet den Rest", async () => {
    localStorage.setItem(
      "jaxel.session",
      JSON.stringify({ paths: ["/fake/missing.xml", "/fake/sample.xml"], activePath: null }),
    );
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "take_pending_open_paths") return [];
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "";
        if (!FILES[path]) throw new Error("Datei nicht gefunden");
        return { content: FILES[path]!, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
      }
      if (cmd === "stat_file") return { mtimeMs: 1000, size: 100 };
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });
    renderApp();

    expect(await screen.findByText("sample.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(screen.queryByText("missing.xml", { selector: ".tab__label" })).not.toBeInTheDocument();
  });
});

describe("Öffnen mit / Kommandozeilen-Pfade (pending open paths)", () => {
  it("öffnet beim Start ALLE wartenden Pfade, nicht nur den ersten", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "take_pending_open_paths") return ["/fake/sample.xml", "/fake/second.xml"];
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
        return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
      }
      if (cmd === "stat_file") return { mtimeMs: 1000, size: 100 };
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });

    renderApp();

    expect(await screen.findByText("sample.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(await screen.findByText("second.xml", { selector: ".tab__label" })).toBeInTheDocument();
  });

  it("zweite Instanz: das Event zieht die Queue erneut ab und öffnet die Datei im laufenden Fenster", async () => {
    await openSampleFile();
    await waitFor(() => expect(eventMock.listeners.has("jaxel://pending-open-paths")).toBe(true));

    // Die zweite Instanz hat "/fake/second.xml" in die Queue gelegt und pingt uns jetzt an.
    vi.mocked(invoke).mockImplementation(async (cmd: unknown, args?: unknown) => {
      if (cmd === "take_pending_open_paths") return ["/fake/second.xml"];
      if (cmd === "read_text_file") {
        const path = (args as { path?: string } | undefined)?.path ?? "/fake/sample.xml";
        return { content: FILES[path] ?? SAMPLE_XML, encoding: "UTF-8", mtimeMs: 1000, size: 100 };
      }
      if (cmd === "stat_file") return { mtimeMs: 1000, size: 100 };
      throw new Error(`unerwarteter invoke-Aufruf: ${String(cmd)}`);
    });
    act(() => eventMock.listeners.get("jaxel://pending-open-paths")!());

    expect(await screen.findByText("second.xml", { selector: ".tab__label" })).toBeInTheDocument();
    expect(await screen.findByText("inventory")).toBeInTheDocument(); // neuer Tab ist aktiv
    expect(screen.getByText("sample.xml", { selector: ".tab__label" })).toBeInTheDocument(); // alter Tab bleibt
  });
});
