import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ContextMenuEntry {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  /** Hover explanation — used to say WHY an entry is greyed out, so a disabled action is not
   * just silently dead (e.g. "Auskommentieren" on a node that already contains a comment). */
  title?: string;
  onClick: () => void;
}

export type ContextMenuItem = ContextMenuEntry | "separator";

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Right-click menu for tree rows. Closes on outside click, Escape, or after any entry runs. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keep the menu inside the viewport (open upwards/leftwards near edges).
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: Math.max(4, Math.min(x, window.innerWidth - rect.width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - rect.height - 4)),
    });
  }, [x, y]);

  return (
    <div
      className="context-menu-backdrop"
      onMouseDown={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        ref={menuRef}
        className="context-menu"
        style={position}
        role="menu"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {items.map((item, index) => {
          if (item === "separator") return <div key={`sep-${index}`} className="context-menu__separator" />;
          const entry = (
            <button
              key={item.label}
              role="menuitem"
              className="context-menu__entry"
              disabled={item.disabled}
              title={item.disabled ? undefined : item.title}
              onClick={() => {
                onClose();
                item.onClick();
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          );
          // A disabled button fires no mouse events, so its own `title` never shows. Wrapping
          // is the only way to still explain WHY an entry is greyed out.
          return item.disabled && item.title ? (
            <span key={item.label} className="context-menu__reason" title={item.title}>
              {entry}
            </span>
          ) : (
            entry
          );
        })}
      </div>
    </div>
  );
}
