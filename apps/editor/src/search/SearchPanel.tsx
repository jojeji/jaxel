import React, { useMemo, useState } from "react";
import type { SearchMatch, SearchOptions, SearchScope } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

/** Beyond this many results the list is cut off (path computation per row isn't free). */
const RESULT_LIMIT = 200;

interface SearchPanelProps {
  onSearch: (options: SearchOptions, subtreeOnly: boolean) => SearchMatch[];
  onNavigate: (match: SearchMatch) => void;
  onReplaceAll: (options: SearchOptions, replacement: string, subtreeOnly: boolean) => number;
  /** null = filter off; otherwise the matches the tree should be reduced to. */
  onFilterChange: (matches: SearchMatch[] | null) => void;
  getMatchPath: (match: SearchMatch) => string;
  onClose: () => void;
  /** Whether a node is currently selected in the tree — "subtree only" needs one to scope to. */
  hasSelection: boolean;
}

/**
 * Bottom-docked search panel (Strg+F): query + options row, then a clickable result
 * list. "Filtern" reduces the tree to matches + ancestors while active (see
 * tree/filter.ts); the checkbox state lives here, the actual row filtering in App.
 */
export function SearchPanel({
  onSearch,
  onNavigate,
  onReplaceAll,
  onFilterChange,
  getMatchPath,
  onClose,
  hasSelection,
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
  const [message, setMessage] = useState<string | null>(null);

  const options = useMemo<SearchOptions>(
    () => ({ query, scope, caseSensitive, useRegex }),
    [query, scope, caseSensitive, useRegex],
  );

  function runSearch(navigateToFirst: boolean): SearchMatch[] {
    setMessage(null);
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

  function handleClose(): void {
    onFilterChange(null);
    onClose();
  }

  function matchLabel(match: SearchMatch): string {
    if (match.matchedIn === "name") return match.node.name;
    if (match.matchedIn === "attribute") {
      const attr = match.node.attributes.find((a) => a.name === match.attributeName);
      return `${match.attributeName}="${attr?.value ?? ""}"`;
    }
    return match.node.value ?? "";
  }

  return (
    <div className="search-panel">
      <div className="search-panel__controls">
        <input
          className="search-panel__query"
          placeholder={t("search.query")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") runSearch(true);
            if (event.key === "Escape") handleClose();
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
        <button className="search-panel__close" onClick={handleClose} title={t("search.close")}>
          ×
        </button>
        {message && <span className="search-panel__message">{message}</span>}
      </div>
      {matches.length > 0 && (
        <ul className="search-panel__results">
          {matches.slice(0, RESULT_LIMIT).map((match, index) => (
            <li key={`${match.node.id}-${match.matchedIn}-${match.attributeName ?? ""}`}>
              <button
                className={`search-panel__result${index === currentIndex ? " search-panel__result--current" : ""}`}
                onClick={() => goToIndex(index)}
              >
                <span className="search-panel__result-path">{getMatchPath(match)}</span>
                <span className="search-panel__result-text">{matchLabel(match)}</span>
              </button>
            </li>
          ))}
          {matches.length > RESULT_LIMIT && (
            <li className="search-panel__more">
              {t("search.moreResults").replace("{n}", String(matches.length - RESULT_LIMIT))}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
