import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App.js";
import { I18nProvider } from "./i18n/index.js";
import type { HostFileContent, HostFileStat, JaxelHost } from "./host.js";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn() }));

/** <person><photo>PGEvPg==</photo></person> — "PGEvPg==" decodes to the XML text "<a/>". */
const HOST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <person id="P-1">
    <photo>PGEvPg==</photo>
  </person>
</catalog>`;

/** A VS Code webview host as the extension drives it: one document, handed over at start. */
function createFakeVscodeHost() {
  const file: HostFileContent = { content: HOST_XML, encoding: "UTF-8", mtimeMs: 1000, size: HOST_XML.length };
  const dirtyReports: boolean[] = [];
  const contentResponses: string[] = [];
  let requestContent: ((requestId: string) => void) | null = null;
  let saved: ((revision?: number, text?: string, stat?: HostFileStat) => void) | null = null;
  const statFile = vi.fn(async (): Promise<HostFileStat> => ({ mtimeMs: 9999, size: 1 }));
  const host: JaxelHost = {
    mode: "vscode",
    readTextFile: async () => file,
    writeTextFile: async () => ({ mtimeMs: 2000, size: 1 }),
    statFile,
    getPortableStorageWarning: async () => null,
    pickOpenFile: async () => null,
    pickSaveFile: async () => null,
    getVersion: async () => null,
    takePendingOpenPaths: async () => [],
    onPendingOpenPaths: () => () => {},
    onCloseRequested: () => () => {},
    onFileDrop: () => () => {},
    destroyWindow: async () => {},
    openParentFolder: async () => "",
    openDecodedFile: async () => "",
    openLog: async () => "",
    log: async () => {},
    getInitialDocument: async () => ({ path: "/ws/host.xml", file }),
    notifyDirty: (dirty) => dirtyReports.push(dirty),
    onRequestCurrentContent: (handler) => {
      requestContent = handler;
      return () => {};
    },
    onRequestSession: () => () => {},
    onSaved: (handler) => {
      saved = handler;
      return () => {};
    },
    respondCurrentContent: (_requestId, text) => contentResponses.push(text),
    respondSession: () => {},
  };
  return {
    host,
    statFile,
    dirtyReports,
    contentResponses,
    requestContent: () => requestContent!("r1"),
    save: (text: string) => saved!(undefined, text, { mtimeMs: 3000, size: text.length }),
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function renderEmbedded() {
  localStorage.setItem("jaxel.locale", "de");
  const fake = createFakeVscodeHost();
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <App host={fake.host} />
    </I18nProvider>,
  );
  await screen.findByText("catalog");
  return { fake, user };
}

async function openBase64Preview(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByText("person"));
  const photoRow = (await screen.findByText("photo")).closest(".tree-row") as HTMLElement;
  await user.click(photoRow);
  fireEvent.contextMenu(photoRow);
  await user.click(await screen.findByRole("menuitem", { name: "Base64 dekodieren" }));
  await screen.findByText("Dekodierter Base64-Inhalt");
}

describe("VS-Code-Modus: genau ein Dokument", () => {
  it("bietet 'Als neuen Tab öffnen' nicht an — ein zweites Dokument ist hier nicht erreichbar", async () => {
    const { user } = await renderEmbedded();
    await openBase64Preview(user);

    expect(screen.queryByRole("button", { name: "Als neuen Tab öffnen" })).not.toBeInTheDocument();
  });

  it("antwortet VS Code mit Inhalt und Dirty-Stand des Host-Dokuments und quittiert dort das Speichern", async () => {
    const { fake, user } = await renderEmbedded();
    await user.click(screen.getByText("catalog"));
    fireEvent.keyDown(window, { key: "+", ctrlKey: true, shiftKey: true }); // Kind anlegen
    await user.keyboard("{Escape}");
    await waitFor(() => expect(fake.dirtyReports.at(-1)).toBe(true));

    fake.requestContent();
    expect(fake.contentResponses.at(-1)).toContain("<node");

    fake.save(fake.contentResponses.at(-1)!);
    await waitFor(() => expect(fake.dirtyReports.at(-1)).toBe(false));
  });

  it("prüft beim Fenster-Fokus nicht selbst auf externe Änderungen — das ist Sache von VS Code", async () => {
    const { fake } = await renderEmbedded();
    fireEvent(window, new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fake.statFile).not.toHaveBeenCalled();
    expect(screen.queryByText("Datei wurde extern geändert")).not.toBeInTheDocument();
  });
});
