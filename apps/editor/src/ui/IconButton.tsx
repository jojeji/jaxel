import React from "react";
import type { Icon } from "@phosphor-icons/react";

interface IconButtonProps {
  icon: Icon;
  /** Accessible name (aria-label) — identical to the old text-button labels so tests and screen readers agree. */
  label: string;
  /** Optional shortcut hint, appended to the tooltip: "Suchen (Strg+F)". */
  shortcut?: string;
  disabled?: boolean;
  primary?: boolean;
  /** A toggle: shown pressed (aria-pressed) while its mode is on. */
  pressed?: boolean;
  onClick: () => void;
}

/** Compact toolbar button: icon only, tooltip carries label + shortcut. */
export function IconButton({
  icon: IconComponent,
  label,
  shortcut,
  disabled,
  primary,
  pressed,
  onClick,
}: IconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className={`icon-btn${primary ? " icon-btn--primary" : ""}${pressed ? " icon-btn--pressed" : ""}`}
      aria-pressed={pressed}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
    >
      <IconComponent size={16} weight="regular" aria-hidden />
    </button>
  );
}
