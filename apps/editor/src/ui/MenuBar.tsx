import React, { useEffect, useRef, useState } from "react";
import type { ContextMenuItem } from "./ContextMenu.js";

/** A non-clickable caption inside a dropdown (e.g. "Zuletzt geöffnet" above a file list). */
export interface MenuHeading {
  heading: string;
}

export type MenuBarEntry = ContextMenuItem | MenuHeading;

export interface MenuBarMenu {
  label: string;
  items: MenuBarEntry[];
}

interface MenuBarProps {
  menus: MenuBarMenu[];
  brand: React.ReactNode;
  trailing?: React.ReactNode;
}

/**
 * Klassische Menüleiste (Datei/Bearbeiten/…), Alternative zur reinen Icon-Toolbar. Teilt sich
 * die Dropdown-Optik (`context-menu__entry`/`__separator`) mit dem Rechtsklick-Kontextmenü
 * (ContextMenu.tsx) — gleiche Aktion, gleiche Optik, nur ein anderer Öffnungs-Trigger.
 * Bewusst ohne Pfeiltasten-Navigation innerhalb der Dropdowns — das bestehende Kontextmenü hat
 * dieselbe Einschränkung (nur Escape/Klick-außerhalb schließen), keine neue, inkonsistente
 * Tastatur-Bedienung einführen.
 */
export function MenuBar({ menus, brand, trailing }: MenuBarProps): React.ReactElement {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpenIndex(null);
    }
    function onMouseDown(event: MouseEvent): void {
      if (barRef.current && !barRef.current.contains(event.target as Node)) setOpenIndex(null);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [openIndex]);

  return (
    <div className="menu-bar" role="menubar" ref={barRef}>
      <span className="menu-bar__brand">{brand}</span>
      {menus.map((menu, index) => (
        <div className="menu-bar__item" key={menu.label}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openIndex === index}
            className="menu-bar__trigger"
            onClick={() => setOpenIndex((current) => (current === index ? null : index))}
            onMouseEnter={() => setOpenIndex((current) => (current === null ? current : index))}
          >
            {menu.label}
          </button>
          {openIndex === index && (
            <div className="menu-bar__dropdown" role="menu">
              {menu.items.map((item, itemIndex) => {
                if (item === "separator") {
                  return <div key={`sep-${itemIndex}`} className="context-menu__separator" />;
                }
                if ("heading" in item) {
                  return (
                    <div key={`heading-${itemIndex}`} className="menu-bar__section-label">
                      {item.heading}
                    </div>
                  );
                }
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className="context-menu__entry"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpenIndex(null);
                      item.onClick();
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <kbd>{item.shortcut}</kbd>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {trailing && <span className="menu-bar__trailing">{trailing}</span>}
    </div>
  );
}
