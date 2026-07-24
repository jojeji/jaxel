import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXmlMinimal } from "../src/format/xml-export.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { syncByteRangesAfterSave } from "../src/commands/byte-range.js";
import type { DocNode } from "../src/model/node.js";

// Regression for: editing field A, saving, then editing a DIFFERENT field B and saving
// again corrupted the file. Root cause: after the first save the app kept using the
// FRESH file text as the byte source for minimal-invasive save, but left every untouched
// node's `byteRange` pointing at offsets from the ORIGINAL source — stale the moment an
// earlier edit shifted anything before it.
describe("syncByteRangesAfterSave", () => {
  it("keeps a second minimal-invasive save correct after an earlier edit shifted byte offsets", () => {
    const source = "<root><a>1</a><b>2</b><c>3</c></root>";
    const { root } = parseXml(source);
    const [a, b, c] = root.children as [DocNode, DocNode, DocNode];
    void c;

    // First edit: "a" gets a much longer value, shifting every byte offset after it.
    createSetValueCommand(a, "MUCH LONGER THAN BEFORE", undefined, [root]).do(undefined as never);
    const textAfterFirstSave = serializeXmlMinimal(source, { root, indent: "" });
    expect(textAfterFirstSave).toContain("<a>MUCH LONGER THAN BEFORE</a>");
    expect(textAfterFirstSave).toContain("<b>2</b>");
    expect(textAfterFirstSave).toContain("<c>3</c>");

    // The fix: refresh byteRanges against the file that was just written, in place.
    syncByteRangesAfterSave(root, parseXml(textAfterFirstSave).root);

    // Second edit: touch "b", leave "c" untouched.
    createSetValueCommand(b, "EDITED", undefined, [root]).do(undefined as never);
    const textAfterSecondSave = serializeXmlMinimal(textAfterFirstSave, { root, indent: "" });

    expect(textAfterSecondSave).toContain("<a>MUCH LONGER THAN BEFORE</a>");
    expect(textAfterSecondSave).toContain("<b>EDITED</b>");
    expect(textAfterSecondSave).toContain("<c>3</c>");
  });

  it("without the refresh, the second save reads the untouched sibling from the wrong offset (bug reproduction)", () => {
    const source = "<root><a>1</a><b>2</b><c>3</c></root>";
    const { root } = parseXml(source);
    const [a, b] = root.children as [DocNode, DocNode];

    createSetValueCommand(a, "MUCH LONGER THAN BEFORE", undefined, [root]).do(undefined as never);
    const textAfterFirstSave = serializeXmlMinimal(source, { root, indent: "" });

    // BUG: no syncByteRangesAfterSave call — "c" still carries its byteRange from the
    // ORIGINAL `source`, but the next save's reference text is `textAfterFirstSave`.
    createSetValueCommand(b, "EDITED", undefined, [root]).do(undefined as never);
    const textAfterSecondSave = serializeXmlMinimal(textAfterFirstSave, { root, indent: "" });

    expect(textAfterSecondSave).not.toContain("<c>3</c>");
  });
});
