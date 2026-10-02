import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DocFormat } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";
import {
  buildRowIndex,
  scrollGeometry,
  tokenizeJson,
  tokenizeXml,
  xmlStateAt,
  type Token,
  type XmlState,
} from "./source-rows.js";

const ROW_HEIGHT = 20;

interface SourceViewProps {
  text: string;
  format: DocFormat;
  /** 0-based line to scroll to and mark when the view opens (the node selected in the tree). */
  jumpToLine: number | null;
  onCopyAll: () => void;
}

/**
 * Quelltextansicht (CONTEXT.md): read-only, virtualized text of the document. Only the rows
 * around the viewport — about one viewport height above and below — are in the DOM, so opening
 * and scrolling stay fast for files of several hundred MB (see source-rows.ts).
 */
export function SourceView({ text, format, jumpToLine, onCopyAll }: SourceViewProps): React.ReactElement {
  const { t } = useI18n();
  const index = useMemo(() => buildRowIndex(text), [text]);
  const geometry = useMemo(() => scrollGeometry(index.rowCount, ROW_HEIGHT), [index]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [targetLine, setTargetLine] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const update = (): void => setViewportHeight(element.clientHeight || 600);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Jump once per request (opening the view), not on every text change: an undo while the view
  // is open keeps the reader where they are.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (jumpToLine === null || !element) return;
    const row = index.rowOfLine(jumpToLine);
    const linesAbove = Math.floor((element.clientHeight || 600) / ROW_HEIGHT / 3);
    const top = geometry.scrollTopFor(Math.max(0, row - linesAbove), element.clientHeight || 600);
    element.scrollTop = top;
    setScrollTop(top);
    setTargetLine(jumpToLine);
  }, [jumpToLine]);

  useEffect(() => {
    // The text may have shrunk (undo): keep the scroll position inside the content.
    const element = scrollRef.current;
    if (element && element.scrollTop !== scrollTop) setScrollTop(element.scrollTop);
  }, [index]);

  const firstRow = geometry.rowAt(scrollTop, viewportHeight);
  const visibleRows = Math.ceil(viewportHeight / ROW_HEIGHT);
  const start = Math.max(0, Math.floor(firstRow) - visibleRows);
  const end = Math.min(index.rowCount, Math.floor(firstRow) + 2 * visibleRows + 1);
  const gutterChars = String(index.lineCount).length;

  const rows: React.ReactElement[] = [];
  // Only the first rendered row looks back for an open comment/CDATA; each row hands its end
  // state to the next (line breaks between rows are plain text in either state).
  let xmlState: XmlState = format === "xml" && start < index.rowCount ? xmlStateAt(text, index.rowStart[start]!) : null;
  for (let row = start; row < end; row++) {
    const from = index.rowStart[row]!;
    const segment = text.slice(from, index.rowEnd[row]);
    let tokens: Token[];
    if (format === "xml") {
      const result = tokenizeXml(segment, xmlState);
      tokens = result.tokens;
      xmlState = result.state;
    } else {
      tokens = tokenizeJson(segment);
    }
    const line = index.rowLine[row]!;
    const continuation = index.isContinuation(row);
    rows.push(
      <div
        key={row}
        className={`source-row${line === targetLine && !continuation ? " source-row--target" : ""}`}
        style={{ top: scrollTop + (row - firstRow) * ROW_HEIGHT }}
        data-line={line + 1}
      >
        <span className="source-row__gutter" style={{ width: `${gutterChars + 1}ch` }} aria-hidden="true">
          {continuation ? "" : line + 1}
        </span>
        <span className="source-row__text">
          {tokens.map((token, i) => (
            <span key={i} className={`source-token source-token--${token.kind}`}>
              {token.text}
            </span>
          ))}
        </span>
      </div>,
    );
  }

  return (
    <div className="source-view">
      <div className="source-view__bar">
        <span className="source-view__info">{t("source.lines").replace("{count}", String(index.lineCount))}</span>
        <button type="button" onClick={onCopyAll}>
          {t("source.copyAll")}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="source-view__scroll"
        role="region"
        aria-label={t("source.label")}
        tabIndex={0}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="source-view__spacer" style={{ height: geometry.contentHeight }}>
          {rows}
        </div>
      </div>
    </div>
  );
}
