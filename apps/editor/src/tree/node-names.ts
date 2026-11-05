import { COMMENT_NAME, type DocNode } from "@jaxel/core";

/** Der im Baum angezeigte Name eines Knotens (XML-Element inkl. Namespace-Präfix, JSON-Schlüssel);
 * null für Knoten ohne Namen — Kommentare. */
export function copyableName(node: DocNode): string | null {
  if (node.kind === "comment" || node.name === COMMENT_NAME || node.name === "") return null;
  return node.name;
}

/** Text für „Bezeichner kopieren“: ein Name pro Zeile in der übergebenen (Baum-)Reihenfolge,
 * namenlose Knoten übersprungen. Null, wenn kein Knoten einen Namen hat. */
export function namesToCopy(nodes: readonly DocNode[]): string | null {
  const names = nodes.map(copyableName).filter((name): name is string => name !== null);
  return names.length > 0 ? names.join("\n") : null;
}
