import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLineDown, ArrowLineRight } from "@phosphor-icons/react";
import type { DocNode, PathSegment, SearchMatch, SearchOptions, SearchScope } from "@jaxel/core";
import { truncatePathLabels } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";
import { IconButton } from "../ui/IconButton.js";
import { ResizeHandle } from "../ui/ResizeHandle.js";
import { ContextMenu } from "../ui/ContextMenu.js";
import {
  getSearchPanelHeight,
  setSearchPanelHeight,
  type SearchDockSide,
} from "../state/local-prefs.js";

/** Beyond this many results the list is cut off (path computation per row isn't free). */
const RESULT_LIMIT = 200;
const MIN_PANEL_HEIGHT = 140;
/** Advance width (px) of one monospace character at the panel's 12px --mono font, rounded
 * UP a bit on purpose: the budget must stay comfortably inside the actual rendered cell, or
 * the CSS text-overflow:ellipsis fallback on .search-panel__result-path (for the rare case
 * this estimate is still too generous) would clip into the always-full trailing segments
 * that truncatePathLabels guarantees to keep intact. A monospace font makes every character
 * the same width, so this sidesteps canvas/DOM text measurement entirely. */
const MONO_CHAR_WIDTH_PX = 7.8;
/** Share of the panel width given to the path column (see .search-panel__result-path). */
const PATH_COLUMN_FRACTION = 0.58;
/** Horizontal padding (both sides) of the path cell PLUS safety margin (scrollbar, rounding)
 * subtracted from the measured column share — see .search-panel__result-path in styles.css. */
const PATH_CELL_PADDING_PX = 44;

type CopyPathKind = "indexed" | "static" | "full";

interface SearchPanelProps {
  onSearch: (options: SearchOptions, subtreeOnly: boolean) => SearchMatch[];
  onNavigate: (match: SearchMatch) => void;
  onReplaceAll: (options: SearchOptions, replacement: string, subtreeOnly: boolean) => number;
  /** null = filter off; otherwise the matches the tree should be reduced to. */
  onFilterChange: (matches: SearchMatch[] | null) => void;
  /** Renderable path segments (root dropped) for one match — SearchPanel formats these
   * itself (namespace stripping, width-adaptive truncation), see truncatePathLabels. */
  getMatchSegments: (match: SearchMatch) => PathSegment[];
  /** Right-click on a result row → copy that match's path, same 3 flavors as the tree. */
  onCopyPath: (node: DocNode, kind: CopyPathKind) => void;
  /** Show namespace prefixes ("ns:name") in the result list instead of stripping them —
   * display-only, does not affect matching or the tree/attributes panel (Settings dialog). */
  showNamespaces: boolean;
  onClose: () => void;
  /** Monotonic request from App: focus and select the existing query without resetting state. */
  focusRequest: number;
  /** Whether a node is currently selected in the tree — "subtree only" needs one to scope to. */
  hasSelection: boolean;
  /** "bottom" = full-width bar under the tree (resizable height); "right" = embedded as a
   * sidebar tab next to the attributes editor (fills the tab's height, no own resize handle). */
  dockSide: SearchDockSide;
  onToggleDock: () => void;
}

function stripNamespace(name: string): string {
  const colon = name.indexOf(":");
  return colon >= 0 ? name.slice(colon + 1) : name;
}

function segmentLabel(segment: PathSegment, showNamespaces: boolean): string {
  const name = showNamespaces ? segment.name : stripNamespace(segment.name);
  return segment.hasSiblingsWithSameName ? `${name}[${segment.indexAmongSameName}]` : name;
}

/**
 * Search panel (Strg+F): query + options row, then a clickable result list. Docks either
 * under the tree or into the right sidebar as a tab (see RightSidebar). "Filtern" reduces
 * the tree to matches + ancestors while active (see tree/filter.ts); the checkbox state
 * lives here, the actual row filtering in App.
 *
 * Keyboard model: Enter always jumps to the current cursor position; the first Enter after
 * the query changed runs a fresh search and jumps to match 0. ArrowUp/ArrowDown only move
 * the cursor within the existing result list (wrapping), they never touch the tree — so you
 * can arrow through results while still typing, and only Enter commits the jump.
 */
export function SearchPanel({
  onSearch,
  onNavigate,
  onReplaceAll,
  onFilterChange,
  getMatchSegments,
  onCopyPath,
  showNamespaces,
  onClose,
  focusRequest,
  hasSelection,
  dockSide,
  onToggleDock,
}: SearchPanelProps): React.ReactElement {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [filterOn, setFilterOn] = useState(false);
  const [subtreeOnly, setSubtreeOnly] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  /** The query string `matches` was computed for — lets Enter tell "still browsing the same
   * result list" apart from "query changed, this Enter must start a fresh search". */
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(getSearchPanelHeight);
  /** Measured panel width, used to size the path column's truncation budget. Starts at
   * "unbounded" (never truncate) until the first real ResizeObserver callback lands — jsdom
   * has no ResizeObserver support (see App.test.tsx's stub), so tests naturally see the
   * full, untruncated path. */
  const [panelWidthPx, setPanelWidthPx] = useState(Number.POSITIVE_INFINITY);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; match: SearchMatch } | null>(null);
  const queryRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queryRef.current?.focus();
    queryRef.current?.select();
  }, [focusRequest]);

  useEffect(() => {
    resultRefs.current[currentIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [currentIndex]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPanelWidthPx(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const options = useMemo<SearchOptions>(
    () => ({ query, scope, caseSensitive, useRegex }),
    [query, scope, caseSensitive, useRegex],
  );

  function runSearch(navigateToFirst: boolean): SearchMatch[] {
    setMessage(null);
    setSearchedQuery(query);
    if (query === "") {
      setMatches([]);
      setCurrentIndex(-1);
      onFilterChange(null);
      return [];
    }
    try {
      const found = onSearch(options, subtreeOnly && hasSelection);
      setMatches(found);
      onFilterChange(filterOn ? found : null);
      if (found.length === 0) {
        setCurrentIndex(-1);
      } else if (navigateToFirst) {
        setCurrentIndex(0);
        onNavigate(found[0]!);
      }
      return found;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setMatches([]);
      setCurrentIndex(-1);
      onFilterChange(null);
      return [];
    }
  }

  /** Enter: fresh search + jump to match 0 if the query changed since the last search,
   * otherwise jump to whatever the cursor (possibly moved by arrow keys) is on. */
  function handleEnter(): void {
    if (query !== searchedQuery || matches.length === 0) {
      runSearch(true);
      return;
    }
    const target = matches[currentIndex] ?? matches[0];
    if (!target) return;
    setCurrentIndex(matches.indexOf(target));
    onNavigate(target);
  }

  /** ArrowUp/ArrowDown: only move the highlighted cursor in the result list, wrapping —
   * the tree is untouched until Enter confirms the jump. */
  function moveCursor(offset: number): void {
    if (matches.length === 0) return;
    const next = (((currentIndex + offset) % matches.length) + matches.length) % matches.length;
    setCurrentIndex(next);
  }

  function goToOffset(offset: number): void {
    const found = matches.length > 0 ? matches : runSearch(false);
    if (found.length === 0) return;
    const next = (((currentIndex + offset) % found.length) + found.length) % found.length;
    setCurrentIndex(next);
    onNavigate(found[next]!);
  }

  function goToIndex(index: number): void {
    const match = matches[index];
    if (!match) return;
    setCurrentIndex(index);
    onNavigate(match);
  }

  function toggleFilter(next: boolean): void {
    setFilterOn(next);
    onFilterChange(next && matches.length > 0 ? matches : null);
  }

  function handleReplaceAll(): void {
    setMessage(null);
    try {
      const count = onReplaceAll(options, replacement, subtreeOnly && hasSelection);
      setMatches([]);
      setCurrentIndex(-1);
      onFilterChange(null);
      setMessage(t("search.replacedCount").replace("{n}", String(count)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function handleHeightDrag(deltaPx: number): void {
    setPanelHeight((current) => {
      const maxHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 200);
      const next = Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, current - deltaPx));
      setSearchPanelHeight(next);
      return next;
    });
  }

  function matchLabel(match: SearchMatch): string {
    const displayName = (name: string) => (showNamespaces ? name : stripNamespace(name));
    if (match.matchedIn === "name") return displayName(match.node.name);
    if (match.matchedIn === "attribute") {
      const attr = match.node.attributes.find((a) => a.name === match.attributeName);
      return `${displayName(match.attributeName ?? "")}="${attr?.value ?? ""}"`;
    }
    return match.node.value ?? "";
  }

  /** Full (untruncated) path labels for one match, namespace-stripped per `showNamespaces`. */
  function pathLabels(match: SearchMatch): string[] {
    return getMatchSegments(match).map((segment) => segmentLabel(segment, showNamespaces));
  }

  function pathCellText(labels: string[]): string {
    const availableWidthPx = Math.max(0, panelWidthPx * PATH_COLUMN_FRACTION - PATH_CELL_PADDING_PX);
    return truncatePathLabels(labels, { availableWidthPx, charWidthPx: MONO_CHAR_WIDTH_PX });
  }

  return (
    <div
      ref={panelRef}
      className={`search-panel search-panel--${dockSide}`}
      style={dockSide === "bottom" ? { height: panelHeight } : undefined}
    >
      {dockSide === "bottom" && (
        <ResizeHandle axis="row" onDrag={handleHeightDrag} label={t("search.resize")} />
      )}
      <div className="search-panel__controls">
        <input
          ref={queryRef}
          className="search-panel__query"
          placeholder={t("search.query")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleEnter();
            else if (event.key === "ArrowDown") {
              event.preventDefault();
              moveCursor(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveCursor(-1);
            } else if (event.key === "Escape") onClose();
          }}
          autoFocus
        />
        <select value={scope} onChange={(event) => setScope(event.target.value as SearchScope)}>
          <option value="all">{t("search.scope.all")}</option>
          <option value="name">{t("search.scope.name")}</option>
          <option value="value">{t("search.scope.value")}</option>
          <option value="attribute">{t("search.scope.attribute")}</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(event) => setCaseSensitive(event.target.checked)}
          />
          {t("search.caseSensitive")}
        </label>
        <label>
          <input type="checkbox" checked={useRegex} onChange={(event) => setUseRegex(event.target.checked)} />
          {t("search.regex")}
        </label>
        <label>
          <input type="checkbox" checked={filterOn} onChange={(event) => toggleFilter(event.target.checked)} />
          {t("search.filter")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={subtreeOnly}
            disabled={!hasSelection}
            onChange={(event) => setSubtreeOnly(event.target.checked)}
          />
          {t("search.subtreeOnly")}
        </label>
        <button onClick={() => runSearch(true)}>{t("search.find")}</button>
        <button onClick={() => goToOffset(1)} disabled={matches.length === 0}>
          {t("search.next")}
        </button>
        <button onClick={() => goToOffset(-1)} disabled={matches.length === 0}>
          {t("search.prev")}
        </button>
        <span className="search-panel__count">
          {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : t("search.noMatches")}
        </span>
        <input
          className="search-panel__replacement"
          placeholder={t("search.replacement")}
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
        />
        <button onClick={handleReplaceAll}>{t("search.replaceAll")}</button>
        <IconButton
          icon={dockSide === "bottom" ? ArrowLineRight : ArrowLineDown}
          label={dockSide === "bottom" ? t("search.dockRight") : t("search.dockBottom")}
          onClick={onToggleDock}
        />
        <button className="search-panel__close" onClick={onClose} title={t("search.close")}>
          ×
        </button>
        {message && <span className="search-panel__message">{message}</span>}
      </div>
      {matches.length > 0 && (
        <div className="search-panel__results">
          <table className="search-panel__results-table">
            <tbody>
              {matches.slice(0, RESULT_LIMIT).map((match, index) => {
                const labels = pathLabels(match);
                return (
                  <tr
                    key={`${match.node.id}-${match.matchedIn}-${match.attributeName ?? ""}`}
                    ref={(el) => {
                      resultRefs.current[index] = el;
                    }}
                    className={`search-panel__result-row${
                      index === currentIndex ? " search-panel__result-row--current" : ""
                    }`}
                    onClick={() => goToIndex(index)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, match });
                    }}
                  >
                    <td className="search-panel__result-path" title={labels.join(".")}>
                      {pathCellText(labels)}
                    </td>
                    <td className="search-panel__result-text">{matchLabel(match)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {matches.length > RESULT_LIMIT && (
            <div className="search-panel__more">
              {t("search.moreResults").replace("{n}", String(matches.length - RESULT_LIMIT))}
            </div>
          )}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: t("toolbar.copyPathFull"), onClick: () => onCopyPath(contextMenu.match.node, "full") },
            { label: t("toolbar.copyPath"), onClick: () => onCopyPath(contextMenu.match.node, "indexed") },
            { label: t("toolbar.copyPathStatic"), onClick: () => onCopyPath(contextMenu.match.node, "static") },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
