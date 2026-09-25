import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml } from "../src/format/xml-export.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";
import { planTreeAction } from "../src/commands/tree-actions.js";
import { createReplaceAllCommand } from "../src/commands/replace-all.js";
import { isValidCommentText } from "../src/commands/comment.js";

const XML = { format: "xml" as const, indent: "  " };

describe("Kommentartext bleibt wohlgeformt", () => {
  it("kennt beide Verbote: kein „--“ und kein „-“ am Ende", () => {
    expect(isValidCommentText(" ok ")).toBe(true);
    expect(isValidCommentText("-am Anfang ist erlaubt")).toBe(true);
    expect(isValidCommentText("a--b")).toBe(false);
    expect(isValidCommentText("endet auf-")).toBe(false);
  });

  it("weist beim Bearbeiten einen Text ab, der auf „-“ endet", () => {
    const { root } = parseXml("<r><!-- x --></r>");
    const comment = root.children[0]!;
    expect(planTreeAction([{ node: comment, ancestors: [root] }], { kind: "set-value", value: "x-" }, XML)).toEqual({
      ok: false,
      blocker: "invalid-comment-text",
    });
  });

  it("überspringt bei „Alle ersetzen“ Kommentare, deren Text danach auf „-“ enden würde", () => {
    const { root } = parseXml("<r><!-- x --><a>x</a></r>");
    const bus = new CommandBus(createDocument({ format: "xml", root }));
    const { command, skippedInComments } = createReplaceAllCommand(
      root,
      root,
      { query: "x ", scope: "value", caseSensitive: true, useRegex: false },
      "x-",
    );
    expect(skippedInComments).toBe(1);
    if (command) bus.execute(command);
    expect(serializeXml({ root, indent: "  " })).not.toContain("--->");
  });
});
