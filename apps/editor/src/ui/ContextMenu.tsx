import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ContextMenuEntry {
  label: string;
  shortcut?: string;
  disabled?: boolean;
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
        {items.map((item, index) =>
          item === "separator" ? (
            <div key={`sep-${index}`} className="context-menu__separator" />
          ) : (
            <button
              key={item.label}
              role="menuitem"
              className="context-menu__entry"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick();
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
