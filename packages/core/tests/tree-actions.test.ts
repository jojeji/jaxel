import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { parseFragments } from "../src/format/fragments.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import {
  moveTargetBlocker,
  planTreeAction,
  treeActionBlocker,
  type TreeAction,
  type TreeActionContext,
  type TreeActionKind,
} from "../src/commands/tree-actions.js";
import type { BulkRow } from "../src/commands/bulk.js";
import type { DocNode } from "../src/model/node.js";

const XML: TreeActionContext = { format: "xml", indent: "  " };

const SOURCE = `<catalog>
  <!-- die erste Person -->
  <person id="P-1"><name>Anna</name></person>
  <!-- <person id="P-9"><name>Zoe</name></person> -->
  <notiz>A--B</notiz>
</catalog>`;

function load(source = SOURCE): { bus: CommandBus; root: DocNode } {
  const { root } = parseXml(source);
  return { bus: new CommandBus(createDocument({ format: "xml", root })), root };
}

/** The row for a node reached by child indexes from the root. */
function rowAt(root: DocNode, ...path: number[]): BulkRow {
  const ancestors: DocNode[] = [];
  let node = root;
  for (const index of path) {
    ancestors.push(node);
    node = node.children[index]!;
  }
  return { node, ancestors };
}

function run(bus: CommandBus, rows: BulkRow[], action: TreeAction) {
  const result = planTreeAction(rows, action, XML);
  if (result.ok) bus.execute(result.plan.command);
  return result;
}

const PROSE = [0];
const PERSON = [1];
const COMMENTED = [2];
const INSIDE = [2, 0]; // <person id="P-9"> inside the commented-out subtree
const NOTIZ = [3];

describe("Schreibschutz im auskommentierten Teilbaum", () => {
  const mutating: TreeAction[] = [
    { kind: "add-child" },
    { kind: "add-sibling" },
    { kind: "add-comment" },
    { kind: "add-comment-child" },
    { kind: "delete" },
    { kind: "duplicate" },
    { kind: "comment-out" },
    { kind: "paste", fragments: [] },
    { kind: "rename", name: "neu" },
    { kind: "set-value", value: "neu" },
    { kind: "set-attribute", name: "x", value: "1" },
    { kind: "rename-attribute", index: 0, name: "neu", coalesceKey: "k" },
  ];

  it.each(mutating.map((action) => [action.kind, action] as const))("sperrt %s", (_kind, action) => {
    const { bus, root } = load();
    const before = serializeXml({ root, indent: "  " });

    const result = run(bus, [rowAt(root, ...INSIDE)], action);

    expect(result).toEqual({ ok: false, blocker: "read-only" });
    expect(serializeXml({ root, indent: "  " })).toBe(before);
  });

  it("sperrt Einfügen hinter einem Knoten im Kommentar, statt ihn beim Speichern zu verlieren", () => {
    const { bus, root } = load();
    const fragments = parseFragments("xml", "<extra/>");

    const result = run(bus, [rowAt(root, ...INSIDE)], { kind: "paste", fragments });

    expect(result).toEqual({ ok: false, blocker: "read-only" });
    expect(root.children[2]!.children[0]!.name).toBe("person");
    expect(root.children[2]!.children).toHaveLength(1);
  });

  it("legt unter einem Kommentar kein Kind an", () => {
    const { bus, root } = load();
    expect(run(bus, [rowAt(root, ...PROSE)], { kind: "add-child" })).toEqual({ ok: false, blocker: "read-only" });
    expect(run(bus, [rowAt(root, ...PROSE)], { kind: "add-comment-child" })).toEqual({
      ok: false,
      blocker: "read-only",
    });
    expect(root.children[0]!.children).toHaveLength(0);
  });

  it("erlaubt am Kommentar selbst Geschwister und Textänderung", () => {
    const { bus, root } = load();
    expect(treeActionBlocker([rowAt(root, ...PROSE)], "add-sibling", XML)).toBeNull();
    expect(treeActionBlocker([rowAt(root, ...PROSE)], "set-value", XML)).toBeNull();
    expect(run(bus, [rowAt(root, ...PROSE)], { kind: "set-value", value: " neu " }).ok).toBe(true);
    expect(root.children[0]!.value).toBe(" neu ");
  });

  it("sperrt eine Mehrfachauswahl, sobald eine Zeile im Kommentar liegt", () => {
    const { root } = load();
    const rows = [rowAt(root, ...PERSON), rowAt(root, ...INSIDE)];
    expect(treeActionBlocker(rows, "delete", XML)).toBe("read-only");
    expect(treeActionBlocker(rows, "duplicate", XML)).toBe("read-only");
  });

  it("verschiebt nichts in einen Kommentar hinein oder aus ihm heraus", () => {
    const { bus, root } = load();
    const person = rowAt(root, ...PERSON);
    expect(run(bus, [person], { kind: "move", target: rowAt(root, ...INSIDE), position: "after" })).toEqual({
      ok: false,
      blocker: "read-only",
    });
    expect(run(bus, [person], { kind: "move", target: rowAt(root, ...COMMENTED), position: "into" })).toEqual({
      ok: false,
      blocker: "read-only",
    });
    expect(treeActionBlocker([rowAt(root, ...INSIDE)], "move", XML)).toBe("read-only");
  });

  it("verschiebt einen Kommentar als Ganzes und legt vor oder hinter einem Kommentar ab", () => {
    const { bus, root } = load();
    const before = serializeXml({ root, indent: "  " });
    expect(run(bus, [rowAt(root, ...PROSE)], { kind: "move", target: rowAt(root, ...NOTIZ), position: "after" }).ok).toBe(
      true,
    );
    expect(root.children.map((n) => n.name)).toEqual(["person", "#comment", "notiz", "#comment"]);
    expect(root.children[3]!.value).toBe(" die erste Person ");

    // Auch ein auskommentierter Teilbaum zieht als Ganzes um, und neben einem Kommentar ist Platz.
    expect(
      run(bus, [rowAt(root, 1)], { kind: "move", target: rowAt(root, 0), position: "into" }).ok,
    ).toBe(true);
    expect(root.children[0]!.children.at(-1)!.kind).toBe("comment");
    expect(run(bus, [rowAt(root, 1)], { kind: "move", target: rowAt(root, 2), position: "after" }).ok).toBe(true);
    expect(root.children.map((n) => n.name)).toEqual(["person", "#comment", "notiz"]);

    bus.undo();
    bus.undo();
    bus.undo();
    expect(serializeXml({ root, indent: "  " })).toBe(before);
  });

  it("sperrt Umbenennen und Attribute am Kommentar selbst", () => {
    const { root } = load();
    const prose = [rowAt(root, ...PROSE)];
    expect(treeActionBlocker(prose, "rename", XML)).toBe("read-only");
    expect(treeActionBlocker(prose, "set-attribute", XML)).toBe("read-only");
    expect(treeActionBlocker(prose, "rename-attribute", XML)).toBe("read-only");
  });
});

describe("Ablageziel beim Verschieben", () => {
  it("erlaubt kein Ablegen in oder neben Zeilen im Kommentar, wohl aber neben dem Kommentar", () => {
    const { root } = load();
    expect(moveTargetBlocker(rowAt(root, ...INSIDE), "before")).toBe("read-only");
    expect(moveTargetBlocker(rowAt(root, ...COMMENTED), "into")).toBe("read-only");
    expect(moveTargetBlocker(rowAt(root, ...COMMENTED), "after")).toBeNull();
    expect(moveTargetBlocker(rowAt(root, ...PERSON), "into")).toBeNull();
  });
});

describe("Pläne für erlaubte Baumaktionen", () => {
  it("legt ein Kind an, klappt den Elternknoten auf und öffnet den Namen", () => {
    const { bus, root } = load();
    const result = run(bus, [rowAt(root, ...PERSON)], { kind: "add-child" });

    expect(result.ok && result.plan.expand).toBe(root.children[1]!.id);
    expect(result.ok && result.plan.edit).toBe("name");
    const child = root.children[1]!.children[1]!;
    expect(result.ok && result.plan.select).toEqual([child.id]);
    expect(child.name).toBe("node");
  });

  it("legt an der sichtbaren Wurzel ein Kind statt eines Geschwisters an", () => {
    const { bus, root } = load();
    const result = run(bus, [rowAt(root)], { kind: "add-sibling" });
    expect(result.ok && result.plan.expand).toBe(root.id);
    expect(root.children.at(-1)!.name).toBe("node");
  });

  it("fügt einen Kommentar als Geschwister ein und öffnet seinen Text", () => {
    const { bus, root } = load();
    const result = run(bus, [rowAt(root, ...PERSON)], { kind: "add-comment" });
    expect(result.ok && result.plan.edit).toBe("value");
    expect(root.children[2]!.kind).toBe("comment");
  });

  it("löscht und dupliziert als je ein Undo-Schritt", () => {
    const { bus, root } = load();
    const rows = [rowAt(root, ...PERSON), rowAt(root, ...NOTIZ)];

    const duplicated = run(bus, rows, { kind: "duplicate" });
    expect(duplicated.ok && duplicated.plan.select).toHaveLength(2);
    expect(root.children.map((n) => n.name)).toEqual(["#comment", "person", "person", "#comment", "notiz", "notiz"]);
    bus.undo();
    expect(root.children).toHaveLength(4);

    expect(run(bus, rows, { kind: "delete" })).toMatchObject({ ok: true, plan: { select: [] } });
    expect(root.children).toHaveLength(2);
  });

  it("meldet für die Wurzel allein 'root' bei Löschen und Duplizieren", () => {
    const { root } = load();
    expect(treeActionBlocker([rowAt(root)], "delete", XML)).toBe("root");
    expect(treeActionBlocker([rowAt(root)], "duplicate", XML)).toBe("root");
  });

  it("kommentiert mehrere Knoten als einen Undo-Schritt aus und wieder ein", () => {
    const { bus, root } = load("<r><a/><b/></r>");
    const rows = [rowAt(root, 0), rowAt(root, 1)];
    expect(run(bus, rows, { kind: "comment-out" }).ok).toBe(true);
    expect(root.children.every((n) => n.kind === "comment")).toBe(true);

    const back = run(bus, [rowAt(root, 0), rowAt(root, 1)], { kind: "uncomment" });
    expect(back.ok).toBe(true);
    expect(root.children.map((n) => n.name)).toEqual(["a", "b"]);
    bus.undo();
    bus.undo();
    expect(root.children.map((n) => n.name)).toEqual(["a", "b"]);
  });

  it("begründet, warum Auskommentieren nicht geht", () => {
    const { root } = load();
    expect(treeActionBlocker([rowAt(root, ...NOTIZ)], "comment-out", XML)).toBe("contains-double-hyphen");
    expect(treeActionBlocker([rowAt(root)], "comment-out", XML)).toBe("root");
    expect(treeActionBlocker([rowAt(load("<r><a><!-- x --></a></r>").root, 0)], "comment-out", XML)).toBe(
      "contains-comment",
    );
    expect(treeActionBlocker([rowAt(root, ...PROSE)], "comment-out", XML)).toBe("read-only");
    expect(treeActionBlocker([rowAt(root, ...PERSON)], "comment-out", { format: "json", indent: "  " })).toBe(
      "xml-only",
    );
  });

  it("holt nur auskommentierte Teilbäume zurück, keine Prosa-Kommentare", () => {
    const { root } = load();
    expect(treeActionBlocker([rowAt(root, ...PROSE)], "uncomment", XML)).toBe("not-commented-subtree");
    expect(treeActionBlocker([rowAt(root, ...COMMENTED)], "uncomment", XML)).toBeNull();
  });

  it("fügt Fragmente hinter der letzten Zeile ein und wählt sie aus", () => {
    const { bus, root } = load();
    const fragments = parseFragments("xml", "<x/><y/>");
    const result = run(bus, [rowAt(root, ...PROSE), rowAt(root, ...PERSON)], { kind: "paste", fragments });

    expect(result.ok && result.plan.select).toEqual(fragments.map((f) => f.id));
    expect(root.children.slice(2, 4).map((n) => n.name)).toEqual(["x", "y"]);
  });

  it("weist leere oder namenlose Fragmente zurück", () => {
    const { bus, root } = load();
    expect(run(bus, [rowAt(root, ...PERSON)], { kind: "paste", fragments: [] })).toEqual({
      ok: false,
      blocker: "invalid-fragment",
    });
    const synthetic = parseFragments("json", "42"); // a bare primitive has no name to insert under
    expect(run(bus, [rowAt(root, ...PERSON)], { kind: "paste", fragments: synthetic })).toEqual({
      ok: false,
      blocker: "invalid-fragment",
    });
  });

  it("verschiebt mehrere Knoten und klappt beim Hineinziehen das Ziel auf", () => {
    const { bus, root } = load("<r><a/><b/><c/></r>");
    const result = run(bus, [rowAt(root, 0), rowAt(root, 1)], {
      kind: "move",
      target: rowAt(root, 2),
      position: "into",
    });
    expect(result.ok && result.plan.expand).toBe(root.children[0]!.id);
    expect(root.children[0]!.children.map((n) => n.name)).toEqual(["a", "b"]);
  });

  it("verschiebt nichts in den eigenen Teilbaum", () => {
    const { bus, root } = load("<r><a><b/></a></r>");
    expect(run(bus, [rowAt(root, 0)], { kind: "move", target: rowAt(root, 0, 0), position: "into" })).toEqual({
      ok: false,
      blocker: "invalid-target",
    });
  });

  it("weist -- im Kommentartext zurück und ignoriert unveränderte Eingaben", () => {
    const { bus, root } = load();
    expect(run(bus, [rowAt(root, ...PROSE)], { kind: "set-value", value: "A--B" })).toEqual({
      ok: false,
      blocker: "contains-double-hyphen",
    });
    expect(run(bus, [rowAt(root, ...PERSON)], { kind: "rename", name: "person" })).toEqual({
      ok: false,
      blocker: "no-change",
    });
    expect(run(bus, [rowAt(root, ...PERSON)], { kind: "rename", name: "  " })).toEqual({
      ok: false,
      blocker: "no-change",
    });
  });

  it("verlangt für Einzelaktionen genau eine Zeile", () => {
    const { root } = load();
    const two = [rowAt(root, ...PERSON), rowAt(root, ...NOTIZ)];
    const single: TreeActionKind[] = ["add-child", "add-sibling", "add-comment", "rename", "set-attribute"];
    for (const kind of single) expect(treeActionBlocker(two, kind, XML)).toBe("no-selection");
    expect(treeActionBlocker([], "paste", XML)).toBe("no-selection");
  });
});
