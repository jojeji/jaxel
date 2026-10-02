/**
 * The source view's model (Quelltextansicht, CONTEXT.md) — React-free so it is testable in Node.
 *
 * A document's text can be several hundred MB, so the view never puts it into the DOM as a
 * whole: it is cut into display rows once per text (`buildRowIndex`), and only the rows around
 * the viewport are rendered (SourceView.tsx). A display row is a line, or a slice of a long line:
 * minified JSON can be one line of many MB, which would otherwise be one gigantic DOM node.
 */

/** Characters per display row before a long line continues in the next row. */
export const MAX_ROW_CHARS = 2000;

export interface RowIndex {
  /** Number of display rows. */
  rowCount: number;
  /** Number of lines in the text. */
  lineCount: number;
  /** Offset in the text where each row starts. */
  rowStart: Float64Array;
  /** Offset where each row ends (exclusive, without the line break). */
  rowEnd: Float64Array;
  /** 0-based line each row belongs to. */
  rowLine: Float64Array;
  /** True when the row continues a line started in an earlier row (no line number shown). */
  isContinuation(row: number): boolean;
  /** The first row of `line`, clamped to the text. */
  rowOfLine(line: number): number;
}

export function buildRowIndex(text: string, maxRowChars = MAX_ROW_CHARS): RowIndex {
  // Two passes: count, then fill typed arrays — a plain array of objects per row would cost far
  // more memory for millions of rows.
  let rowCount = 0;
  forEachLine(text, (start, end) => {
    rowCount += Math.max(1, Math.ceil((end - start) / maxRowChars));
  });
  const rowStart = new Float64Array(rowCount);
  const rowEnd = new Float64Array(rowCount);
  const rowLine = new Float64Array(rowCount);
  let row = 0;
  let line = 0;
  forEachLine(text, (start, end) => {
    let at = start;
    do {
      rowStart[row] = at;
      rowEnd[row] = Math.min(end, at + maxRowChars);
      rowLine[row] = line;
      row++;
      at += maxRowChars;
    } while (at < end);
    line++;
  });
  return {
    rowCount,
    lineCount: line,
    rowStart,
    rowEnd,
    rowLine,
    isContinuation: (r) => r > 0 && rowLine[r] === rowLine[r - 1],
    rowOfLine(target) {
      const wanted = Math.max(0, Math.min(target, line - 1));
      let lo = 0;
      let hi = rowCount - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (rowLine[mid]! < wanted) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
  };
}

/** Calls `visit(start, end)` for every line; `end` excludes "\n" and a preceding "\r". */
function forEachLine(text: string, visit: (start: number, end: number) => void): void {
  let start = 0;
  for (;;) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 ? text.length : newline;
    visit(start, end > start && text.charCodeAt(end - 1) === 13 ? end - 1 : end);
    if (newline === -1) return;
    start = newline + 1;
  }
}

/**
 * Browsers cap an element's height (some at about 16–33 million px), so the scrollable area is
 * limited to `MAX_SCROLL_HEIGHT`; beyond it, scroll positions map onto rows proportionally.
 */
export const MAX_SCROLL_HEIGHT = 8_000_000;

export interface ScrollGeometry {
  /** Height of the scrollable content in px. */
  contentHeight: number;
  /** First row to show for a given `scrollTop`, fractional. */
  rowAt(scrollTop: number, viewportHeight: number): number;
  /** `scrollTop` that shows `row` at the top. */
  scrollTopFor(row: number, viewportHeight: number): number;
}

export function scrollGeometry(rowCount: number, rowHeight: number): ScrollGeometry {
  const natural = rowCount * rowHeight;
  const contentHeight = Math.min(natural, MAX_SCROLL_HEIGHT);
  return {
    contentHeight,
    rowAt(scrollTop, viewportHeight) {
      if (natural === contentHeight) return scrollTop / rowHeight;
      const maxScroll = Math.max(1, contentHeight - viewportHeight);
      const maxRow = Math.max(0, rowCount - viewportHeight / rowHeight);
      return (Math.min(scrollTop, maxScroll) / maxScroll) * maxRow;
    },
    scrollTopFor(row, viewportHeight) {
      if (natural === contentHeight) return row * rowHeight;
      const maxScroll = Math.max(1, contentHeight - viewportHeight);
      const maxRow = Math.max(1, rowCount - viewportHeight / rowHeight);
      return (Math.min(row, maxRow) / maxRow) * maxScroll;
    },
  };
}

export type TokenKind = "tag" | "attr" | "string" | "comment" | "punct" | "key" | "number" | "literal" | "text";

export interface Token {
  text: string;
  kind: TokenKind;
}

/** How far back a row looks for an open `<!--` / `<![CDATA[` it might start inside of. */
const LOOKBACK = 100_000;

/** Whether `offset` lies inside an XML comment or CDATA section opened before it. Looks back at
 * most `LOOKBACK` characters — a longer comment is coloured as plain text past that point. */
export function xmlStateAt(text: string, offset: number): XmlState {
  const from = Math.max(0, offset - LOOKBACK);
  const window = text.slice(from, offset);
  const comment = window.lastIndexOf("<!--");
  if (comment !== -1 && window.indexOf("-->", comment + 4) === -1) return "comment";
  const cdata = window.lastIndexOf("<![CDATA[");
  if (cdata !== -1 && window.indexOf("]]>", cdata + 9) === -1) return "cdata";
  return null;
}

export type XmlState = "comment" | "cdata" | null;

/** Colours one row of XML. `state`: what the row starts inside of (`xmlStateAt` for the first
 * rendered row, then the previous row's returned `state`). */
export function tokenizeXml(row: string, state: XmlState): { tokens: Token[]; state: XmlState } {
  const tokens: Token[] = [];
  let i = 0;
  let open: XmlState = null;
  const push = (text: string, kind: TokenKind): void => {
    if (text) tokens.push({ text, kind });
  };
  if (state) {
    const close = state === "comment" ? "-->" : "]]>";
    const end = row.indexOf(close);
    const kind = state === "comment" ? "comment" : "text";
    if (end === -1) return { tokens: row ? [{ text: row, kind }] : [], state };
    push(row.slice(0, end + 3), kind);
    i = end + 3;
  }
  while (i < row.length) {
    const lt = row.indexOf("<", i);
    if (lt === -1) {
      push(row.slice(i), "text");
      break;
    }
    push(row.slice(i, lt), "text");
    if (row.startsWith("<!--", lt)) {
      const end = row.indexOf("-->", lt + 4);
      const stop = end === -1 ? row.length : end + 3;
      if (end === -1) open = "comment";
      push(row.slice(lt, stop), "comment");
      i = stop;
      continue;
    }
    if (row.startsWith("<![CDATA[", lt)) {
      const end = row.indexOf("]]>", lt);
      const stop = end === -1 ? row.length : end + 3;
      if (end === -1) open = "cdata";
      push(row.slice(lt, stop), "text");
      i = stop;
      continue;
    }
    const gt = row.indexOf(">", lt);
    const stop = gt === -1 ? row.length : gt + 1;
    tokenizeTag(row.slice(lt, stop), push);
    i = stop;
  }
  return { tokens, state: open };
}

/** `<name a="1">`, `</name>`, `<?xml …?>` — a name in tag colour, attributes and values. */
function tokenizeTag(tag: string, push: (text: string, kind: TokenKind) => void): void {
  const head = /^<[/?!]?[^\s/>?]*/.exec(tag)![0];
  push(head, "tag");
  const attr = /(\s+)([^\s=/>?]+)|(=)|("[^"]*"?|'[^']*'?)|(\s*[/?]?>)|([^])/g;
  attr.lastIndex = head.length;
  for (let m = attr.exec(tag); m; m = attr.exec(tag)) {
    if (m[2] !== undefined) {
      push(m[1]!, "text");
      push(m[2], "attr");
    } else if (m[3] !== undefined) push(m[3], "punct");
    else if (m[4] !== undefined) push(m[4], "string");
    else if (m[5] !== undefined) push(m[5], "tag");
    else push(m[6]!, "text");
  }
}

/** Colours one row of JSON. A string continued from the previous row is not detected — rows
 * only split strings longer than `MAX_ROW_CHARS`, and then the rest is coloured as plain text. */
export function tokenizeJson(row: string): Token[] {
  const tokens: Token[] = [];
  const re = /("(?:[^"\\]|\\.)*"?)(\s*:)?|(-?\d[\d.eE+-]*)|(true|false|null)|([{}[\],:])|(\s+)|([^])/g;
  for (let m = re.exec(row); m; m = re.exec(row)) {
    if (m[1] !== undefined) {
      tokens.push({ text: m[1], kind: m[2] !== undefined ? "key" : "string" });
      if (m[2] !== undefined) tokens.push({ text: m[2], kind: "punct" });
    } else if (m[3] !== undefined) tokens.push({ text: m[3], kind: "number" });
    else if (m[4] !== undefined) tokens.push({ text: m[4], kind: "literal" });
    else if (m[5] !== undefined) tokens.push({ text: m[5], kind: "punct" });
    else tokens.push({ text: m[0], kind: "text" });
  }
  return tokens;
}

/** Child indices from `root` to the last node of `chain` (a root-first ancestor chain that
 * contains `root`), or null when `root` is not in it. */
export function pathFrom<T extends { children: T[] }>(root: T, chain: T[]): number[] | null {
  const start = chain.indexOf(root);
  if (start === -1) return null;
  const path: number[] = [];
  for (let i = start + 1; i < chain.length; i++) {
    const index = chain[i - 1]!.children.indexOf(chain[i]!);
    if (index === -1) return null;
    path.push(index);
  }
  return path;
}
