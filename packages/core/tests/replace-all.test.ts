import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import type { SearchOptions } from "../src/search/search.js";

function options(overrides: Partial<SearchOptions>): SearchOptions {
  return { query: "", scope: "value", caseSensitive: false, useRegex: false, ...overrides };
}

describe("createReplaceAllCommand", () => {
  it("returns command: null and replacementCount: 0 when nothing matches", () => {
    const { root } = parseXml("<root><a>1</a></root>");
    const result = createReplaceAllCommand(root, root, options({ query: "xyz" }), "!");

    expect(result.command).toBeNull();
    expect(result.replacementCount).toBe(0);
  });

  it("bundles every touched field into one undoable command, sums replacementCount", () => {
    const { root } = parseXml("<root><a>foo foo</a><b>foo</b><c>bar</c></root>");
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    const result = createReplaceAllCommand(root, root, options({ query: "foo" }), "baz");
    expect(result.command).not.toBeNull();
    expect(result.replacementCount).toBe(3); // 2 in <a> + 1 in <b>

    bus.execute(result.command!);
    expect(root.children[0]!.value).toBe("baz baz");
    expect(root.children[1]!.value).toBe("baz");
    expect(root.children[2]!.value).toBe("bar"); // untouched

    bus.undo(); // ONE undo step reverts every touched field
    expect(root.children[0]!.value).toBe("foo foo");
    expect(root.children[1]!.value).toBe("foo");
  });

  it("clears byteRange on touched nodes and their ancestors, leaves untouched siblings intact", () => {
    const source = "<root><a>foo</a><b>bar</b></root>";
    const { root } = parseXml(source);
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);

    const result = createReplaceAllCommand(root, root, options({ query: "foo" }), "baz");
    bus.execute(result.command!);

    expect(root.byteRange).toBeUndefined();
    expect(root.children[0]!.byteRange).toBeUndefined();
    expect(root.children[1]!.byteRange).toEqual(
      parseXml(source).root.children[1]!.byteRange,
    );
  });

  it("narrows the search to searchRoot but still traces ancestor chains from trueRoot", () => {
    const { root } = parseXml("<root><section><a>foo</a></section><b>foo</b></root>");
    const doc = createDocument({ format: "xml", root });
    const bus = new CommandBus(doc);
    const section = root.children[0]!;

    // searchRoot = the subtree, trueRoot = the whole document.
    const result = createReplaceAllCommand(root, section, options({ query: "foo" }), "baz");
    expect(result.replacementCount).toBe(1);

    bus.execute(result.command!);
    expect(section.children[0]!.value).toBe("baz"); // inside the scoped subtree: replaced
    expect(root.children[1]!.value).toBe("foo"); // outside the scope: untouched
    expect(root.byteRange).toBeUndefined(); // ancestor chain still invalidated up to trueRoot
  });
});
