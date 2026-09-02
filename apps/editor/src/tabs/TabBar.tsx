import React from "react";
import { CaretLeft, CaretRight, List, MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "../i18n/index.js";
import type { TabState } from "../state/document-store.js";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu.js";

interface TabBarProps {
  tabs: TabState[];
  activeKey: string | null;
  /** File paths of every document with unsaved changes (see OpenDocumentState.isDirty) — a
   * Set rather than the full doc list so TabBar doesn't need to know about OpenDocumentState. */
  dirtyPaths: ReadonlySet<string>;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
  onCloseAll: () => void;
  onCloseOthers: (key: string) => void;
  onCloseToRight: (key: string) => void;
  onCloseToLeft: (key: string) => void;
  onCopyPath: (path: string) => void;
  onOpenParentFolder: (path: string) => void;
  onReorder: (key: string, targetIndex: number) => void;
  onNewDocument: () => void;
}

function fileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/** Focus tabs show "<node name> — <file name>" so they're distinguishable from the full-view
 * tab of the same document; `focusLabel` is a snapshot (see document-store.ts) so this never
 * needs to walk the (possibly huge) tree just to render a label. */
function tabLabel(tab: TabState): string {
  const name = fileName(tab.filePath);
  return tab.focusLabel ? `${tab.focusLabel} — ${name}` : name;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function TabBar({
  tabs,
  activeKey,
  dirtyPaths,
  onActivate,
  onClose,
  onCloseAll,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  onCopyPath,
  onOpenParentFolder,
  onReorder,
  onNewDocument,
}: TabBarProps): React.ReactElement | null {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; tab: TabState } | null>(null);
  const [overviewOpen, setOverviewOpen] = React.useState(false);
  const [overviewQuery, setOverviewQuery] = React.useState("");
  const [overviewIndex, setOverviewIndex] = React.useState(0);
  const [overflow, setOverflow] = React.useState({ left: false, right: false });
  const dragKey = React.useRef<string | null>(null);
  const suppressClick = React.useRef(false);
  const tabRefs = React.useRef(new Map<string, HTMLDivElement>());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const overviewRef = React.useRef<HTMLDivElement>(null);
  const overviewButtonRef = React.useRef<HTMLButtonElement>(null);

  const updateOverflow = React.useCallback((): void => {
    const element = scrollRef.current;
    if (!element) return;
    setOverflow({
      left: element.scrollLeft > 1,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);

  const scrollTabIntoView = React.useCallback((key: string): void => {
    const container = scrollRef.current;
    const tab = tabRefs.current.get(key);
    if (!container || !tab) return;
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < container.scrollLeft) container.scrollTo({ left, behavior: "auto" });
    else if (right > container.scrollLeft + container.clientWidth) {
      container.scrollTo({ left: right - container.clientWidth, behavior: "auto" });
    }
  }, []);

  React.useLayoutEffect(() => {
    updateOverflow();
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tabs.length, updateOverflow]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.addEventListener("scroll", updateOverflow, { passive: true });
    return () => element.removeEventListener("scroll", updateOverflow);
  }, [updateOverflow]);

  React.useEffect(() => {
    if (activeKey) scrollTabIntoView(activeKey);
  }, [activeKey, scrollTabIntoView]);

  React.useEffect(() => {
    if (!overviewOpen) return;
    function onMouseDown(event: MouseEvent): void {
      if (
        !overviewRef.current?.contains(event.target as Node) &&
        !overviewButtonRef.current?.contains(event.target as Node)
      ) setOverviewOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [overviewOpen]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return;
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeKey));
        const direction = event.shiftKey ? -1 : 1;
        const nextTab = tabs[(activeIndex + direction + tabs.length) % tabs.length];
        if (nextTab) onActivate(nextTab.key);
      } else if (event.ctrlKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setOverviewOpen(true);
        setOverviewQuery("");
        setOverviewIndex(0);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeKey, onActivate, tabs]);

  React.useEffect(() => {
    if (overviewOpen) {
      window.setTimeout(() => overviewRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
    }
  }, [overviewOpen]);

  if (tabs.length === 0) return null;

  const filteredTabs = tabs.filter((tab) => tabLabel(tab).toLocaleLowerCase().includes(overviewQuery.toLocaleLowerCase()));
  const hasOverflow = overflow.left || overflow.right;
  const overviewLabel = t("tabs.overview").replace("{n}", String(tabs.length));

  function activateFromOverview(key: string): void {
    onActivate(key);
    setOverviewOpen(false);
  }

  function scrollByPage(direction: -1 | 1): void {
    const element = scrollRef.current;
    if (element) element.scrollBy({ left: direction * Math.max(element.clientWidth - 32, 96), behavior: "auto" });
  }

  function itemsFor(tab: TabState): ContextMenuItem[] {
    const index = tabs.findIndex((candidate) => candidate.key === tab.key);
    const isUntitled = /^Unbenannt-\d+$/.test(tab.filePath);
    return [
      { label: t("tabs.close"), onClick: () => onClose(tab.key) },
      { label: t("tabs.closeAll"), onClick: onCloseAll },
      { label: t("tabs.closeOthers"), disabled: tabs.length < 2, onClick: () => onCloseOthers(tab.key) },
      { label: t("tabs.closeRight"), disabled: index === tabs.length - 1, onClick: () => onCloseToRight(tab.key) },
      { label: t("tabs.closeLeft"), disabled: index === 0, onClick: () => onCloseToLeft(tab.key) },
      "separator",
      {
        label: t("tabs.copyPath"),
        disabled: isUntitled,
        title: isUntitled ? t("tabs.noPath") : undefined,
        onClick: () => onCopyPath(tab.filePath),
      },
      { label: t("tabs.openParentFolder"), disabled: isUntitled, title: isUntitled ? t("tabs.noPath") : undefined, onClick: () => onOpenParentFolder(tab.filePath) },
    ];
  }

  return (
    <div
      className="tab-bar"
      title={t("tabs.newDocumentHint")}
      onClick={(event) => {
        // Nur Klicks auf die freie Fläche rechts neben den Tabs, nicht auf Tabs selbst.
        if (event.target === event.currentTarget) onNewDocument();
      }}
    >
      {hasOverflow && (
        <button className="tab-bar__control" type="button" aria-label={t("tabs.previousPage")} title={t("tabs.previousPage")} disabled={!overflow.left} onClick={() => scrollByPage(-1)}>
          <CaretLeft size={16} weight="bold" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="tab-bar__scroll"
        onWheel={(event) => {
          if (!hasOverflow) return;
          const delta = event.deltaX || event.deltaY;
          if (delta !== 0) {
            event.currentTarget.scrollLeft += delta;
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onNewDocument();
        }}
      >
      {tabs.map((tab) => {
        const dirty = dirtyPaths.has(tab.filePath);
        return (
          <div
            key={tab.key}
            className={`tab${tab.key === activeKey ? " tab--active" : ""}${dirty ? " tab--dirty" : ""}`}
            title={dirty ? `${tab.filePath} — ${t("tabs.unsaved")}` : tab.filePath}
            role="tab"
            tabIndex={tab.key === activeKey ? 0 : -1}
            aria-selected={tab.key === activeKey}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.key, element);
              else tabRefs.current.delete(tab.key);
            }}
            draggable
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onActivate(tab.key);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({ x: event.clientX, y: event.clientY, tab });
            }}
            onKeyDown={(event) => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                setContextMenu({ x: rect.left + 12, y: rect.bottom, tab });
              }
            }}
            onDragStart={(event) => {
              dragKey.current = tab.key;
              suppressClick.current = true;
              const ghost = document.createElement("div");
              ghost.className = "tab-drag-ghost";
              ghost.textContent = tabLabel(tab);
              document.body.appendChild(ghost);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setDragImage(ghost, 12, 12);
              requestAnimationFrame(() => ghost.remove());
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = scrollRef.current?.getBoundingClientRect();
              if (rect) {
                const edge = 40;
                if (event.clientX < rect.left + edge) scrollRef.current?.scrollBy({ left: -24, behavior: "auto" });
                if (event.clientX > rect.right - edge) scrollRef.current?.scrollBy({ left: 24, behavior: "auto" });
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceKey = dragKey.current;
              dragKey.current = null;
              if (!sourceKey || sourceKey === tab.key) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const targetIndex = tabs.findIndex((candidate) => candidate.key === tab.key) + (event.clientX > rect.left + rect.width / 2 ? 1 : 0);
              const sourceIndex = tabs.findIndex((candidate) => candidate.key === sourceKey);
              onReorder(sourceKey, targetIndex > sourceIndex ? targetIndex - 1 : targetIndex);
            }}
            onDragEnd={() => {
              dragKey.current = null;
              window.setTimeout(() => { suppressClick.current = false; }, 0);
            }}
          >
            <span className="tab__label">{tabLabel(tab)}</span>
            {dirty && <span className="tab__dirty-dot" aria-hidden="true" />}
            <button
              className="tab__close"
              title={t("tabs.close")}
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.key);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      </div>
      {hasOverflow && (
        <button className="tab-bar__control" type="button" aria-label={t("tabs.nextPage")} title={t("tabs.nextPage")} disabled={!overflow.right} onClick={() => scrollByPage(1)}>
          <CaretRight size={16} weight="bold" />
        </button>
      )}
      {tabs.length > 1 && (
        <div className="tab-overview-anchor">
          <button
            ref={overviewButtonRef}
            className="tab-bar__control tab-bar__overview-button"
            type="button"
            aria-label={overviewLabel}
            title={overviewLabel}
            aria-expanded={overviewOpen}
            onClick={() => {
              setOverviewOpen((open) => !open);
              setOverviewQuery("");
              setOverviewIndex(0);
            }}
          >
            <List size={16} weight="bold" />
            <span className="tab-bar__overview-count">{tabs.length}</span>
          </button>
          {overviewOpen && (
            <div ref={overviewRef} className="tab-overview" role="dialog" aria-label={overviewLabel}>
              <div className="tab-overview__search">
                <MagnifyingGlass size={15} aria-hidden="true" />
                <input
                  value={overviewQuery}
                  placeholder={t("tabs.searchPlaceholder")}
                  aria-label={t("tabs.searchPlaceholder")}
                  onChange={(event) => {
                    setOverviewQuery(event.target.value);
                    setOverviewIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setOverviewOpen(false);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setOverviewIndex((index) => Math.min(index + 1, Math.max(filteredTabs.length - 1, 0)));
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setOverviewIndex((index) => Math.max(index - 1, 0));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const tab = filteredTabs[overviewIndex];
                      if (tab) activateFromOverview(tab.key);
                    }
                  }}
                />
              </div>
              <div className="tab-overview__list" role="listbox">
                {filteredTabs.length === 0 ? (
                  <div className="tab-overview__empty">{t("tabs.noMatches")}</div>
                ) : filteredTabs.map((tab, index) => (
                  <div key={tab.key} className={`tab-overview__item${tab.key === activeKey ? " tab-overview__item--active" : ""}${index === overviewIndex ? " tab-overview__item--focused" : ""}`} role="option" aria-selected={tab.key === activeKey} onMouseEnter={() => setOverviewIndex(index)}>
                    <button className="tab-overview__activate" type="button" onClick={() => activateFromOverview(tab.key)}>
                      <span className="tab-overview__name">{tabLabel(tab)}</span>
                      <span className="tab-overview__path">{tab.filePath}</span>
                      {dirtyPaths.has(tab.filePath) && <span className="tab-overview__dirty">{t("tabs.unsaved")}</span>}
                    </button>
                    <button className="tab-overview__close" type="button" aria-label={`${t("tabs.close")}: ${tabLabel(tab)}`} title={t("tabs.close")} onClick={() => onClose(tab.key)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={itemsFor(contextMenu.tab)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
