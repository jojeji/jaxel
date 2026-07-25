import { describe, expect, it } from "vitest";
import { parseXml } from "../src/format/xml-import.js";
import { serializeXml, serializeXmlMinimal } from "../src/format/xml-export.js";
import { createNode, type DocNode } from "../src/model/node.js";
import { createSetValueCommand } from "../src/commands/set-value.js";
import { syncByteRangesAfterSave } from "../src/commands/byte-range.js";
import { CommandBus } from "../src/commands/command-bus.js";
import { createDocument } from "../src/model/document.js";

/**
 * Everything outside the root element (DOCTYPE, comments above the root, trailing content) has
 * no place in the tree and used to be discarded on parse — so merely opening and saving a file
 * dropped it. These tests pin down that it now survives verbatim.
 */

/** Parse + save with nothing touched in between — the exact path a user takes when they open a
 * file and hit Strg+S without editing. */
function openAndSave(source: string): string {
  const parsed = parseXml(source);
  return serializeXmlMinimal(source, {
    root: parsed.root,
    indent: "  ",
    xmlDeclaration: parsed.xmlDeclaration,
    prolog: parsed.prolog,
    epilog: parsed.epilog,
  });
}

describe("Prolog und Epilog beim Speichern", () => {
  it("behält den DOCTYPE", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<catalog>
  <person>Anna</person>
</catalog>
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält Kommentare über der Wurzel", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Copyright 2026 -->
<!-- generiert, nicht von Hand ändern -->
<catalog>
  <person>Anna</person>
</catalog>
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält Verarbeitungsanweisungen über der Wurzel", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="katalog.xsl"?>
<catalog>
  <person>Anna</person>
</catalog>
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält einen DOCTYPE mit internem Subset", () => {
    const source = `<?xml version="1.0"?>
<!DOCTYPE catalog [
  <!ELEMENT catalog (person*)>
  <!ENTITY firma "Beispiel GmbH">
]>
<catalog>
  <person>Anna</person>
</catalog>
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält Inhalt NACH dem schließenden Wurzel-Tag", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <person>Anna</person>
</catalog>
<!-- Ende der Datei -->
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält alles zusammen, in der ursprünglichen Reihenfolge", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<?xml-stylesheet type="text/xsl" href="katalog.xsl"?>
<!-- Copyright 2026 -->
<catalog>
  <!-- die erste Person -->
  <person id="P-1">
    <name>Anna</name>
  </person>
</catalog>
<!-- fertig -->
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("respektiert eine fehlende Schluss-Zeilenschaltung", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n  <person>Anna</person>\n</catalog>`;
    expect(openAndSave(source)).toBe(source);
    expect(openAndSave(source).endsWith("</catalog>")).toBe(true);
  });

  it("kommt ohne XML-Deklaration aus", () => {
    const source = `<!-- ohne Deklaration -->
<catalog>
  <person>Anna</person>
</catalog>
`;
    expect(openAndSave(source)).toBe(source);
  });

  it("behält den Prolog auch dann, wenn ein Knoten geändert wurde", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<catalog>
  <person>Anna</person>
</catalog>
`;
    const parsed = parseXml(source);
    // Eine Änderung, die den byteRange-Kurzschluss für Wurzel UND Kind aufhebt:
    // genau der Fall, in dem der Prolog früher verlorenging.
    parsed.root.byteRange = undefined;
    parsed.root.children[0]!.byteRange = undefined;
    parsed.root.children[0]!.value = "Bert";

    const out = serializeXmlMinimal(source, {
      root: parsed.root,
      indent: "  ",
      xmlDeclaration: parsed.xmlDeclaration,
      prolog: parsed.prolog,
      epilog: parsed.epilog,
    });

    expect(out).toContain('<!DOCTYPE catalog SYSTEM "catalog.dtd">');
    expect(out).toContain("<person>Bert</person>");
  });
});

describe("Zweimal speichern mit Prolog", () => {
  // Der Prolog verschiebt jeden Byte-Offset im Dokument. Genau in dieser Ecke saßen schon zwei
  // kritische Fehler (siehe byte-range-sync.test.ts), deshalb hier der volle Ablauf:
  // ändern → speichern → an anderer Stelle ändern → erneut speichern.
  it("bleibt korrekt, wenn zwischen zwei Speichervorgängen verschiedene Knoten geändert werden", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<!-- Copyright 2026 -->
<catalog><a>1</a><b>2</b></catalog>
`;
    const parsed = parseXml(source);
    const framing = {
      xmlDeclaration: parsed.xmlDeclaration,
      prolog: parsed.prolog,
      epilog: parsed.epilog,
    };
    const bus = new CommandBus(createDocument({ format: "xml", root: parsed.root, ...framing }));
    const [a, b] = parsed.root.children as [DocNode, DocNode];

    bus.execute(createSetValueCommand(a, "VIEL LAENGER ALS VORHER", undefined, [parsed.root]));
    const afterFirst = serializeXmlMinimal(source, { root: parsed.root, indent: "", ...framing });
    expect(afterFirst).toContain('<!DOCTYPE catalog SYSTEM "catalog.dtd">');
    expect(afterFirst).toContain("<a>VIEL LAENGER ALS VORHER</a>");
    expect(afterFirst).toContain("<b>2</b>");

    // Wie im Speicherpfad der App: Offsets gegen die eben geschriebene Datei auffrischen.
    syncByteRangesAfterSave(parsed.root, parseXml(afterFirst).root);

    bus.execute(createSetValueCommand(b, "auch geaendert", undefined, [parsed.root]));
    const afterSecond = serializeXmlMinimal(afterFirst, { root: parsed.root, indent: "", ...framing });

    expect(afterSecond).toContain('<!DOCTYPE catalog SYSTEM "catalog.dtd">');
    expect(afterSecond).toContain("<!-- Copyright 2026 -->");
    expect(afterSecond).toContain("<a>VIEL LAENGER ALS VORHER</a>");
    expect(afterSecond).toContain("<b>auch geaendert</b>");
    // Der Prolog darf sich dabei nicht verdoppelt haben.
    expect(afterSecond.match(/DOCTYPE/g)).toHaveLength(1);
  });
});

describe("Bäume ohne geparste Herkunft", () => {
  it("schreibt weiterhin die schlichte Form, wenn kein Rahmen vorliegt", () => {
    const root = createNode({ name: "root", children: [createNode({ name: "a", value: "1" })] });
    expect(serializeXml({ root, indent: "  ", xmlDeclaration: '<?xml version="1.0"?>' })).toBe(
      '<?xml version="1.0"?>\n<root>\n  <a>1</a>\n</root>\n',
    );
  });

  it("kommt auch ganz ohne Deklaration und Rahmen zurecht", () => {
    const root = createNode({ name: "root", value: "x" });
    expect(serializeXml({ root, indent: "  " })).toBe("<root>x</root>\n");
  });
});
