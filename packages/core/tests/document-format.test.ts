import { describe, expect, it } from "vitest";
import { parseDocument, serializeDocument } from "../src/format/document.js";

describe("parseDocument", () => {
  it("parses XML and preserves the xmlDeclaration", () => {
    const source = '<?xml version="1.0" encoding="UTF-8"?>\n<root><a>1</a></root>';
    const { root, xmlDeclaration } = parseDocument("xml", source);

    expect(root.name).toBe("root");
    expect(xmlDeclaration).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("parses JSON, with no xmlDeclaration", () => {
    const { root, xmlDeclaration } = parseDocument("json", '{"a": 1}');

    expect(root.name).toBe("a");
    expect(xmlDeclaration).toBeUndefined();
  });
});

describe("serializeDocument", () => {
  it("serializes XML with the xmlDeclaration", () => {
    const { root, xmlDeclaration } = parseDocument("xml", '<?xml version="1.0"?>\n<root><a>1</a></root>');
    const text = serializeDocument({ format: "xml", root, xmlDeclaration, indent: "  " });

    expect(text).toContain('<?xml version="1.0"?>');
    expect(text).toContain("<a>1</a>");
  });

  it("serializes JSON", () => {
    const { root } = parseDocument("json", '{"a": 1}');
    const text = serializeDocument({ format: "json", root, indent: "  " });

    expect(JSON.parse(text)).toEqual({ a: 1 });
  });
});
