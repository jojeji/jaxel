import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml, serializeXmlMinimal } from "../src/format/xml-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { createSetAttributeCommand } from "../src/commands/set-attribute.js";

/** Parses `source`, edits one unrelated leaf (which rebuilds every ancestor from the model), saves. */
function editSiblingAndSave(source: string, leafName: string): string {
  const parsed = parseXml(source);
  const bus = new CommandBus(createDocument({ format: "xml", ...parsed }));
  const leaf = parsed.root.children.find((child) => child.name === leafName)!;
  bus.execute(createSetValueCommand(leaf, "geändert", undefined, [parsed.root]));
  return serializeXmlMinimal(source, {
    root: parsed.root,
    indent: "  ",
    xmlDeclaration: parsed.xmlDeclaration,
    prolog: parsed.prolog,
    epilog: parsed.epilog,
  });
}

/** Parses `source`, changes an attribute of the element `name` itself (rebuilding it and its text
 * from the model), saves. */
function editOwnAttributeAndSave(source: string, name: string): string {
  const parsed = parseXml(source);
  const bus = new CommandBus(createDocument({ format: "xml", ...parsed }));
  const target = parsed.root.children.find((child) => child.name === name)!;
  bus.execute(createSetAttributeCommand(target, "neu", "1", [parsed.root]));
  return serializeXmlMinimal(source, { root: parsed.root, indent: "  " });
}

describe("XML-Zeichendaten: Import und Export passen zusammen", () => {
  it("lässt eine unbekannte Entity-Referenz im Attribut stehen, wenn ein Geschwister bearbeitet wird", () => {
    const out = editSiblingAndSave('<!DOCTYPE r [<!ENTITY c "x">]>\n<r a="&c;"><b>1</b></r>\n', "b");
    expect(out).toContain('a="&c;"');
  });

  it("lässt eine unbekannte Entity-Referenz im Text stehen", () => {
    const out = editOwnAttributeAndSave("<r><p>a&nbsp;b</p></r>", "p");
    expect(out).toContain('<p neu="1">a&nbsp;b</p>');
  });

  it("macht aus einem maskierten Klartext „&amp;nbsp;“ keine echte Referenz", () => {
    const out = editOwnAttributeAndSave("<r><p>a&amp;nbsp;b</p></r>", "p");
    expect(out).toContain('<p neu="1">a&amp;nbsp;b</p>');
  });

  it("dekodiert und maskiert die vordefinierten Entities wie bisher", () => {
    const { root } = parseXml('<r a="x &amp; &quot;y&quot;">1 &lt; 2 &amp; 3 &gt; 0 &#38; &#x41;</r>');
    expect(root.attributes[0]!.value).toBe('x & "y"');
    expect(root.value).toBe("1 < 2 & 3 > 0 & A");
    expect(serializeXml({ root, indent: "  " })).toBe(
      '<r a="x &amp; &quot;y&quot;">1 &lt; 2 &amp; 3 &gt; 0 &amp; A</r>\n',
    );
  });

  it("maskiert ein einzelnes & ohne Referenzform", () => {
    const { root } = parseXml("<r>AT&amp;T und a &amp;b</r>");
    expect(root.value).toBe("AT&T und a &b");
    expect(serializeXml({ root, indent: "  " })).toBe("<r>AT&amp;T und a &amp;b</r>\n");
  });
});
