import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { parseJson } from "../src/format/json-import.js";
import { serializeJson } from "../src/format/json-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import { findAll } from "../src/search/search.js";

const names = (query: string) => ({ query, scope: "name" as const, caseSensitive: true, useRegex: false });

// "#comment" and "$root" are names Jaxel invents; they are not in the file. Renaming them turned
// a comment node into something with a name and a top-level JSON array into an object.
describe("Namenssuche übergeht erfundene Namen", () => {
  it("findet und ersetzt nicht den Namen eines Kommentarknotens", () => {
    const { root } = parseXml("<root><!-- hi --><comment/></root>");
    expect(findAll(root, names("comment")).map((m) => m.node.kind)).toEqual(["element"]);
    const { command } = createReplaceAllCommand(root, root, names("#comment"), "note");
    expect(command).toBeNull();
    expect(root.children[0]!.name).toBe("#comment");
  });

  it("benennt „$root“ eines JSON-Arrays nicht um", () => {
    const { root } = parseJson('[{"x":1},{"x":2}]');
    const bus = new CommandBus(createDocument({ format: "json", root }));
    expect(findAll(root, names("root"))).toEqual([]);
    const { command } = createReplaceAllCommand(root, root, names("root"), "top", "json");
    if (command) bus.execute(command);
    expect(JSON.parse(serializeJson({ root, indent: "  " }))).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it("findet echte Schlüssel weiterhin", () => {
    const { root } = parseJson('[{"root":1}]');
    expect(findAll(root, names("root")).map((m) => m.node.name)).toEqual(["root"]);
  });
});
