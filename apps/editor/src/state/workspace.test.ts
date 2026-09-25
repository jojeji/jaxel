import { describe, expect, it } from "vitest";
import {
  createSetValueCommand,
  pathSegmentsOf,
  type DocNode,
  type PathSegment,
} from "@jaxel/core";
import type { HostFileContent, HostFileStat } from "../host.js";
import { Workspace, type WorkspaceHost, type WorkspaceSnapshot } from "./workspace.js";

/** Second adapter at the workspace's host seam: files live in a Map, writes bump the mtime. */
class InMemoryHost implements WorkspaceHost {
  readonly files = new Map<string, string>();
  readonly writes: string[] = [];
  private clock = 1000;

  constructor(files: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(files)) this.files.set(path, text);
  }

  async readTextFile(path: string): Promise<HostFileContent> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`no such file: ${path}`);
    return { content, encoding: "UTF-8", mtimeMs: this.clock, size: content.length };
  }

  async writeTextFile(path: string, content: string): Promise<HostFileStat> {
    this.files.set(path, content);
    this.writes.push(path);
    this.clock += 1;
    return { mtimeMs: this.clock, size: content.length };
  }

  async log(): Promise<void> {}
}

// Already in Jaxel's own indentation: a changed node and its ancestors are re-serialized (best
// effort, docs/entscheidungen.md #1), so only then is the expected file text exact.
const CATALOG = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <person id="P-1">
    <name>Anna</name>
  </person>
  <person id="P-2">
    <name>Ben</name>
  </person>
  <person id="P-3"><name>Cleo</name></person>
</catalog>
`;

async function openCatalog(files: Record<string, string> = { "/c.xml": CATALOG }) {
  const host = new InMemoryHost(files);
  const workspace = new Workspace(host);
  await workspace.openFile(Object.keys(files)[0]!);
  return { host, workspace };
}

function active(workspace: Workspace) {
  const { tab, doc } = Workspace.active(workspace.getSnapshot());
  return { tab: tab!, doc: doc! };
}

function nameNode(workspace: Workspace, personIndex: number): { node: DocNode; ancestors: DocNode[] } {
  const root = active(workspace).doc.document.root;
  const person = root.children[personIndex]!;
  return { node: person.children[0]!, ancestors: [root, person] };
}

function setName(workspace: Workspace, personIndex: number, value: string): void {
  const { node, ancestors } = nameNode(workspace, personIndex);
  active(workspace).doc.commandBus.execute(createSetValueCommand(node, value, undefined, ancestors));
}

describe("Öffnen und Tabs", () => {
  it("öffnet eine Datei als aktiven Vollansicht-Tab", async () => {
    const { workspace } = await openCatalog();
    const snapshot = workspace.getSnapshot();
    expect(snapshot.tabs.map((t) => t.key)).toEqual(["/c.xml"]);
    expect(active(workspace).doc.document.root.name).toBe("catalog");
  });

  it("lädt eine schon offene Datei nicht doppelt, sondern aktiviert sie", async () => {
    const { workspace } = await openCatalog({ "/a.xml": "<a/>", "/b.xml": "<b/>" });
    await workspace.openFile("/b.xml");
    const docBefore = workspace.getSnapshot().docs[0];
    await workspace.openFile("/a.xml");
    expect(workspace.getSnapshot().docs).toHaveLength(2);
    expect(workspace.getSnapshot().docs[0]).toBe(docBefore);
    expect(active(workspace).tab.key).toBe("/a.xml");
  });

  it("stellt den Vollansicht-Tab wieder her, wenn nur noch ein Fokus-Tab offen war", async () => {
    const { workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[0]!.id, "person", [root.id]);
    workspace.closeTab("/c.xml");
    expect(workspace.getSnapshot().tabs.map((t) => t.focusNodeId)).toEqual([root.children[0]!.id]);

    await workspace.openFile("/c.xml");
    expect(workspace.getSnapshot().tabs.map((t) => t.key)).toEqual([`/c.xml#${root.children[0]!.id}`, "/c.xml"]);
  });

  it("aktiviert beim Schließen den rechten Nachbarn, am Ende den linken", async () => {
    const { workspace } = await openCatalog({ "/a.xml": "<a/>", "/b.xml": "<b/>", "/c.xml": "<c/>" });
    await workspace.openFile("/b.xml");
    await workspace.openFile("/c.xml");
    workspace.activate("/b.xml");
    workspace.closeTab("/b.xml");
    expect(active(workspace).tab.key).toBe("/c.xml");
    workspace.closeTab("/c.xml");
    expect(active(workspace).tab.key).toBe("/a.xml");
    workspace.closeTab("/a.xml");
    expect(workspace.getSnapshot().activeKey).toBeNull();
  });

  it("entlädt ein Dokument erst mit seinem letzten Tab und hört dann auf seine Commands nicht mehr", async () => {
    const { workspace } = await openCatalog();
    const { doc } = active(workspace);
    const root = doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[0]!.id, "person", [root.id]);
    workspace.closeTab("/c.xml");
    expect(workspace.getSnapshot().docs).toHaveLength(1);

    workspace.closeTab(`/c.xml#${root.children[0]!.id}`);
    expect(workspace.getSnapshot().docs).toHaveLength(0);
    const revision = workspace.getSnapshot().revision;
    doc.commandBus.execute(createSetValueCommand(root.children[0]!.children[0]!, "x", undefined, [root]));
    expect(workspace.getSnapshot().revision).toBe(revision);
  });

  it("verschiebt Tabs mit begrenztem Zielindex", async () => {
    const { workspace } = await openCatalog({ "/a.xml": "<a/>", "/b.xml": "<b/>", "/c.xml": "<c/>" });
    await workspace.openFile("/b.xml");
    await workspace.openFile("/c.xml");
    workspace.reorderTabs("/a.xml", 99);
    expect(workspace.getSnapshot().tabs.map((t) => t.key)).toEqual(["/b.xml", "/c.xml", "/a.xml"]);
  });

  it("verschmilzt einen Fokus-Tab mit der Vollansicht, wenn er auf die Wurzel zurückspringt", async () => {
    const { workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[0]!.id, "person", [root.id]);
    const focusKey = active(workspace).tab.key;

    workspace.retargetFocusTab(focusKey, null, null, []);
    expect(workspace.getSnapshot().tabs.map((t) => t.key)).toEqual(["/c.xml"]);
    expect(active(workspace).tab.key).toBe("/c.xml");
  });

  it("zählt neue Dokumente als Unbenannt-N hoch", () => {
    const workspace = new Workspace(new InMemoryHost());
    workspace.newDocument("xml");
    workspace.newDocument("json");
    expect(workspace.getSnapshot().docs.map((d) => [d.filePath, d.format, d.isUntitled])).toEqual([
      ["Unbenannt-1", "xml", true],
      ["Unbenannt-2", "json", true],
    ]);
  });
});

describe("Schließen planen", () => {
  it("meldet ein geändertes Dokument, wenn Vollansicht und Fokus-Tab zusammen schließen", async () => {
    const { workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[0]!.id, "person", [root.id]);
    setName(workspace, 0, "Anne");

    const plan = workspace.planClose(workspace.getSnapshot().tabs.map((t) => t.key));
    expect(plan.dirty.map((d) => d.filePath)).toEqual(["/c.xml"]);
  });

  it("meldet nichts, solange ein anderer Tab das Dokument offen hält", async () => {
    const { workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[0]!.id, "person", [root.id]);
    setName(workspace, 0, "Anne");

    expect(workspace.planClose([`/c.xml#${root.children[0]!.id}`]).dirty).toEqual([]);
    expect(workspace.planClose(["/c.xml"]).dirty).toEqual([]);
  });

  it("meldet alle geänderten Dokumente einer Tab-Menge auf einmal, unveränderte nicht", async () => {
    const { workspace } = await openCatalog({ "/c.xml": CATALOG, "/d.xml": "<d><x/></d>", "/e.xml": "<e/>" });
    setName(workspace, 0, "Anne");
    await workspace.openFile("/d.xml");
    const d = active(workspace).doc;
    d.commandBus.execute(createSetValueCommand(d.document.root.children[0]!, "1", undefined, [d.document.root]));
    await workspace.openFile("/e.xml");

    const plan = workspace.planClose(["/c.xml", "/d.xml", "/e.xml"]);
    expect(plan.dirty.map((doc) => doc.filePath)).toEqual(["/c.xml", "/d.xml"]);
  });

  it("schließt mehrere Tabs auf einmal", async () => {
    const { workspace } = await openCatalog({ "/a.xml": "<a/>", "/b.xml": "<b/>", "/c.xml": "<c/>" });
    await workspace.openFile("/b.xml");
    await workspace.openFile("/c.xml");
    workspace.closeTabs(["/a.xml", "/c.xml"]);
    expect(workspace.getSnapshot().tabs.map((t) => t.key)).toEqual(["/b.xml"]);
    expect(workspace.getSnapshot().docs.map((d) => d.filePath)).toEqual(["/b.xml"]);
  });
});

describe("Dirty und Speichern", () => {
  it("leitet Dirty aus dem Undo-Stapel ab, Undo bis zur Baseline macht wieder sauber", async () => {
    const { workspace } = await openCatalog();
    setName(workspace, 0, "Anne");
    expect(active(workspace).doc.isDirty).toBe(true);
    active(workspace).doc.commandBus.undo();
    expect(active(workspace).doc.isDirty).toBe(false);
  });

  it("jeder Command erzeugt einen neuen Snapshot mit höherer Revision", async () => {
    const { workspace } = await openCatalog();
    const seen: WorkspaceSnapshot[] = [];
    workspace.subscribe(() => seen.push(workspace.getSnapshot()));
    setName(workspace, 0, "Anne");
    expect(seen).toHaveLength(1);
    expect(seen[0]!.revision).toBeGreaterThan(0);
  });

  it("speichert minimal-invasiv und bleibt über mehrere Speichervorgänge korrekt", async () => {
    // Regression für „Byte-Offsets nach dem Speichern auffrischen“: die zweite Speicherung
    // nach einer längenverändernden ersten darf keine veralteten Offsets benutzen — P-3 bleibt
    // unberührt und wird über seinen Bytebereich kopiert (daher bewusst nicht eingerückt).
    const { host, workspace } = await openCatalog();
    setName(workspace, 0, "Annabella");
    await workspace.saveFile();
    expect(active(workspace).doc.isDirty).toBe(false);
    setName(workspace, 1, "Benedikt");
    await workspace.saveFile();

    expect(host.files.get("/c.xml")).toBe(
      CATALOG.replace("<name>Anna</name>", "<name>Annabella</name>").replace("<name>Ben</name>", "<name>Benedikt</name>"),
    );
    expect(active(workspace).doc.lastKnownMtimeMs).toBe(1002);
  });

  it("schreibt nach Speichern, Undo und erneutem Speichern den ursprünglichen Wert", async () => {
    // Regression für „Save-Epoche“.
    const { host, workspace } = await openCatalog();
    setName(workspace, 0, "Annabella");
    await workspace.saveFile();
    active(workspace).doc.commandBus.undo();
    await workspace.saveFile();
    expect(host.files.get("/c.xml")).toBe(CATALOG);
  });

  it("zieht beim Speichern unter alle Tabs des Dokuments auf den neuen Pfad um", async () => {
    const { host, workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[1]!.id, "person", [root.id]);

    await workspace.saveFileAs("/c.xml", "/neu.xml");

    expect(host.files.get("/neu.xml")).toBe(CATALOG);
    expect(workspace.getSnapshot().tabs.map((t) => t.key)).toEqual(["/neu.xml", `/neu.xml#${root.children[1]!.id}`]);
    expect(active(workspace).tab.key).toBe(`/neu.xml#${root.children[1]!.id}`);
    expect(workspace.getSnapshot().docs[0]!.filePath).toBe("/neu.xml");
  });

  it("macht aus einem unbenannten Dokument beim Speichern unter ein gewöhnliches", async () => {
    const host = new InMemoryHost();
    const workspace = new Workspace(host);
    workspace.newDocument("json");
    await workspace.saveFileAs("Unbenannt-1", "/x.json");
    expect(active(workspace).doc.isUntitled).toBe(false);
    expect(host.files.get("/x.json")).toBe("{}");
  });

  it("übernimmt eine Speicherung des Hosts als neue Baseline (VS-Code-Modus)", async () => {
    const { host, workspace } = await openCatalog();
    setName(workspace, 0, "Annabella");
    const written = CATALOG.replace("<name>Anna</name>", "<name>Annabella</name>");

    workspace.acknowledgeSaved("/c.xml", written, { mtimeMs: 5000, size: written.length });

    const { doc } = active(workspace);
    expect(doc.isDirty).toBe(false);
    expect(doc.sourceText).toBe(written);
    expect(doc.lastKnownMtimeMs).toBe(5000);
    // Die nächste eigene Speicherung arbeitet gegen den vom Host geschriebenen Text.
    setName(workspace, 1, "Benedikt");
    await workspace.saveFile();
    expect(host.files.get("/c.xml")).toBe(written.replace("<name>Ben</name>", "<name>Benedikt</name>"));
  });
});

describe("Neu laden und Konvertieren", () => {
  function segmentsOf(workspace: Workspace, node: DocNode): PathSegment[] {
    return pathSegmentsOf(active(workspace).doc.document.root, node)!;
  }

  it("löst Auswahl und Fokus-Tab nach dem Neuladen über den Pfad auf", async () => {
    const { host, workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    const secondName = root.children[1]!.children[0]!;
    workspace.openFocusTab("/c.xml", root.children[1]!.id, "person", [root.id]);
    host.files.set("/c.xml", CATALOG.replace("Ben", "Benno"));

    const view = await workspace.reloadFile("/c.xml", segmentsOf(workspace, secondName), []);

    const newRoot = active(workspace).doc.document.root;
    expect(newRoot).not.toBe(root);
    expect(view!.selectedId).toBe(newRoot.children[1]!.children[0]!.id);
    expect(active(workspace).tab.focusNodeId).toBe(newRoot.children[1]!.id);
    expect(active(workspace).doc.commandBus.canUndo()).toBe(false);
  });

  it("fällt für einen verschwundenen Fokus-Knoten auf den nächsten Vorfahren zurück und entfernt Duplikate", async () => {
    const { host, workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.openFocusTab("/c.xml", root.children[1]!.children[0]!.id, "name", [root.id, root.children[1]!.id]);
    workspace.openFocusTab("/c.xml", root.children[1]!.id, "person", [root.id]);
    host.files.set("/c.xml", '<catalog><person id="P-1"/><person id="P-2"/></catalog>');

    await workspace.reloadFile("/c.xml", null, []);

    const newRoot = active(workspace).doc.document.root;
    expect(workspace.getSnapshot().tabs.map((t) => t.focusNodeId)).toEqual([null, newRoot.children[1]!.id]);
  });

  it("lässt beim Neuladen alles unverändert, wenn canCommit ablehnt", async () => {
    const { host, workspace } = await openCatalog();
    const before = workspace.getSnapshot();
    host.files.set("/c.xml", "<andere/>");
    expect(await workspace.reloadFile("/c.xml", null, [], () => false)).toBeNull();
    expect(workspace.getSnapshot()).toBe(before);
  });

  it("konvertiert beim Speichern unter in das andere Format", async () => {
    const { host, workspace } = await openCatalog();
    await workspace.convertSaveAs("/c.xml", "/c.json", "json", null, []);
    const { doc, tab } = active(workspace);
    expect(tab.key).toBe("/c.json");
    expect(doc.format).toBe("json");
    expect(JSON.parse(host.files.get("/c.json")!)).toHaveProperty("catalog");
  });

  it("schreibt bei einer unmöglichen Konvertierung keine Datei", async () => {
    const { host, workspace } = await openCatalog({ "/d.json": '{"a b": 1}' });
    await expect(workspace.convertSaveAs("/d.json", "/d.xml", "xml", null, [])).rejects.toThrow();
    expect(host.writes).toEqual([]);
    expect(active(workspace).doc.format).toBe("json");
  });

  it("merkt sich eine beobachtete Dateiversion ohne Inhalt zu ändern", async () => {
    const { workspace } = await openCatalog();
    const root = active(workspace).doc.document.root;
    workspace.acknowledgeExternalChange("/c.xml", 7777, 12);
    expect(active(workspace).doc.lastKnownMtimeMs).toBe(7777);
    expect(active(workspace).doc.document.root).toBe(root);
  });

});
