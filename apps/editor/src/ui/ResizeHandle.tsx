import React, { useRef } from "react";

interface ResizeHandleProps {
  /** "row" = horizontal bar, drag changes a height; "column" = vertical bar, drag changes a width. */
  axis: "row" | "column";
  /** Called with the pointer's movement since the last call (px); sign follows clientX/clientY. */
  onDrag: (deltaPx: number) => void;
  label: string;
}

/** Thin draggable bar for resizing an adjacent panel. Owns only the pointer tracking —
 * clamping and persisting the resulting size is the caller's job. */
export function ResizeHandle({ axis, onDrag, label }: ResizeHandleProps): React.ReactElement {
  const lastPos = useRef(0);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    lastPos.current = axis === "row" ? event.clientY : event.clientX;

    function handlePointerMove(moveEvent: PointerEvent): void {
      const pos = axis === "row" ? moveEvent.clientY : moveEvent.clientX;
      onDrag(pos - lastPos.current);
      lastPos.current = pos;
    }
    function handlePointerUp(): void {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      className={`resize-handle resize-handle--${axis}`}
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation={axis === "row" ? "horizontal" : "vertical"}
      aria-label={label}
    />
  );
}
