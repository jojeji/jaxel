import React, { useState } from "react";
import { useI18n } from "../i18n/index.js";
import { ResizeHandle } from "../ui/ResizeHandle.js";
import { getSearchSidebarWidth, setSearchSidebarWidth } from "../state/local-prefs.js";

const MIN_WIDTH = 220;
const MAX_WIDTH = 640;

export type SidebarTab = "attributes" | "search";

interface RightSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  /** Whether the "Suche" tab has any content to show (no open document = no search session). */
  searchAvailable: boolean;
  attributes: React.ReactNode;
  search: React.ReactNode;
}

/** Right-docked sidebar shared by the attributes editor and the search panel, switched via
 * tabs so both keep their live state (scroll position, query, matches) while hidden. */
export function RightSidebar({
  activeTab,
  onTabChange,
  searchAvailable,
  attributes,
  search,
}: RightSidebarProps): React.ReactElement {
  const { t } = useI18n();
  const [width, setWidth] = useState(getSearchSidebarWidth);

  function handleDrag(deltaPx: number): void {
    setWidth((current) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, current - deltaPx));
      setSearchSidebarWidth(next);
      return next;
    });
  }

  return (
    <div className="right-sidebar" style={{ width }}>
      <ResizeHandle axis="column" onDrag={handleDrag} label={t("sidebar.resize")} />
      <div className="right-sidebar__body">
        <div className="right-sidebar__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "attributes"}
            className={`right-sidebar__tab${activeTab === "attributes" ? " right-sidebar__tab--active" : ""}`}
            onClick={() => onTabChange("attributes")}
          >
            {t("attributes.title")}
          </button>
          {searchAvailable && (
            <button
              role="tab"
              aria-selected={activeTab === "search"}
              className={`right-sidebar__tab${activeTab === "search" ? " right-sidebar__tab--active" : ""}`}
              onClick={() => onTabChange("search")}
            >
              {t("toolbar.search")}
            </button>
          )}
        </div>
        <div className="right-sidebar__panel" hidden={activeTab !== "attributes"}>
          {attributes}
        </div>
        {searchAvailable && (
          <div className="right-sidebar__panel right-sidebar__panel--search" hidden={activeTab !== "search"}>
            {search}
          </div>
        )}
      </div>
    </div>
  );
}
