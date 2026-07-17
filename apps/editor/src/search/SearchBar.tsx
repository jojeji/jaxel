import React, { useMemo, useState } from "react";
import type { SearchMatch, SearchOptions, SearchScope } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface SearchBarProps {
  onSearch: (options: SearchOptions) => SearchMatch[];
  onNavigate: (match: SearchMatch) => void;
  onReplaceAll: (options: SearchOptions, replacement: string) => number;
  onClose: () => void;
}

export function SearchBar({ onSearch, onNavigate, onReplaceAll, onClose }: SearchBarProps): React.ReactElement {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo<SearchOptions>(
    () => ({ query, scope, caseSensitive, useRegex }),
    [query, scope, caseSensitive, useRegex],
  );

  function runSearch(navigateToFirst: boolean): SearchMatch[] {
    setError(null);
    if (query === "") {
      setMatches([]);
      setCurrentIndex(-1);
      return [];
    }
    try {
      const found = onSearch(options);
      setMatches(found);
      if (found.length === 0) {
        setCurrentIndex(-1);
      } else if (navigateToFirst) {
        setCurrentIndex(0);
        onNavigate(found[0]!);
      }
      return found;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMatches([]);
      setCurrentIndex(-1);
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

  function handleReplaceAll(): void {
    setError(null);
    try {
      const count = onReplaceAll(options, replacement);
      setMatches([]);
      setCurrentIndex(-1);
      setError(t("search.replacedCount").replace("{n}", String(count)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="search-bar">
      <input
        className="search-bar__query"
        placeholder={t("search.query")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") runSearch(true);
          if (event.key === "Escape") onClose();
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
      <button onClick={() => runSearch(true)}>{t("search.find")}</button>
      <button onClick={() => goToOffset(1)} disabled={matches.length === 0}>
        {t("search.next")}
      </button>
      <button onClick={() => goToOffset(-1)} disabled={matches.length === 0}>
        {t("search.prev")}
      </button>
      <span className="search-bar__count">
        {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : t("search.noMatches")}
      </span>
      <input
        className="search-bar__replacement"
        placeholder={t("search.replacement")}
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <button onClick={handleReplaceAll}>{t("search.replaceAll")}</button>
      <button onClick={onClose} title={t("search.close")}>
        ×
      </button>
      {error && <span className="search-bar__error">{error}</span>}
    </div>
  );
}
