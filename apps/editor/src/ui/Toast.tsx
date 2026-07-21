import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "../i18n/index.js";

export interface ToastProps {
  id: number;
  kind: "status" | "error";
  message: string;
  durationMs: number;
  onClose: () => void;
}

export function Toast({ id, kind, message, durationMs, onClose }: ToastProps): React.ReactElement {
  const { t } = useI18n();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef(durationMs);
  const startedAtRef = useRef(0);
  const pauseReasonsRef = useRef(new Set<"hover" | "focus">());
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  function clearTimer(): void {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function startTimer(delayMs: number): void {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onCloseRef.current();
    }, delayMs);
  }

  useEffect(() => {
    clearTimer();
    remainingMsRef.current = durationMs;
    if (pauseReasonsRef.current.size === 0) startTimer(durationMs);
    return clearTimer;
    // `id` deliberately restarts identical messages; onClose is read through a live ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, durationMs]);

  function pause(reason: "hover" | "focus"): void {
    if (pauseReasonsRef.current.has(reason)) return;
    pauseReasonsRef.current.add(reason);
    if (timerRef.current !== null) {
      remainingMsRef.current = Math.max(
        0,
        remainingMsRef.current - (Date.now() - startedAtRef.current),
      );
      clearTimer();
    }
  }

  function resume(reason: "hover" | "focus"): void {
    if (!pauseReasonsRef.current.delete(reason)) return;
    if (
      pauseReasonsRef.current.size > 0 ||
      timerRef.current !== null ||
      remainingMsRef.current <= 0
    ) {
      return;
    }
    startTimer(remainingMsRef.current);
  }

  function handleClose(): void {
    clearTimer();
    onCloseRef.current();
  }

  return (
    <div
      className={`toast toast--${kind}`}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      onMouseEnter={() => pause("hover")}
      onMouseLeave={() => resume("hover")}
      onFocusCapture={() => pause("focus")}
      onBlurCapture={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
          return;
        }
        resume("focus");
      }}
    >
      <span className="toast__message">{message}</span>
      <button
        type="button"
        className="toast__close"
        aria-label={t("toast.close")}
        title={t("toast.close")}
        onClick={handleClose}
      >
        ×
      </button>
    </div>
  );
}
