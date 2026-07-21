import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/index.js";
import { Toast } from "./Toast.js";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem("jaxel.locale", "de");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

function renderToast({
  id = 1,
  kind = "status",
  durationMs = 4_000,
  onClose = vi.fn(),
}: {
  id?: number;
  kind?: "status" | "error";
  durationMs?: number;
  onClose?: () => void;
} = {}) {
  const result = render(
    <I18nProvider>
      <Toast id={id} kind={kind} message="Testmeldung" durationMs={durationMs} onClose={onClose} />
    </I18nProvider>,
  );
  return { ...result, onClose };
}

describe("Toast", () => {
  it("schließt eine Statusmeldung nach vier Sekunden", () => {
    const { onClose } = renderToast();

    act(() => vi.advanceTimersByTime(3_999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("schließt eine Fehlermeldung erst nach acht Sekunden", () => {
    const { onClose } = renderToast({ kind: "error", durationMs: 8_000 });

    act(() => vi.advanceTimersByTime(7_999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("lässt sich über den zugänglich beschrifteten Schließen-Button sofort schließen", () => {
    const { onClose } = renderToast();

    fireEvent.click(screen.getByRole("button", { name: "Meldung schließen" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pausiert bei Hover und setzt exakt mit der Restzeit fort", () => {
    const { onClose } = renderToast();
    const toast = screen.getByRole("status");
    act(() => vi.advanceTimersByTime(1_500));

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(2_499));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pausiert bei Tastaturfokus und setzt nach dem Verlassen exakt fort", () => {
    const { onClose } = renderToast();
    const closeButton = screen.getByRole("button", { name: "Meldung schließen" });
    act(() => vi.advanceTimersByTime(1_500));

    fireEvent.focus(closeButton);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.blur(closeButton);
    act(() => vi.advanceTimersByTime(2_499));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("startet bei einer neuen ID auch mit identischem Text die volle Dauer neu", () => {
    const onClose = vi.fn();
    const { rerender } = renderToast({ onClose });
    act(() => vi.advanceTimersByTime(3_000));

    rerender(
      <I18nProvider>
        <Toast id={2} kind="status" message="Testmeldung" durationMs={4_000} onClose={onClose} />
      </I18nProvider>,
    );
    act(() => vi.advanceTimersByTime(3_999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("räumt den Timer beim Unmount auf und unterscheidet Fehler semantisch", () => {
    const { unmount } = renderToast({ kind: "error", durationMs: 8_000 });
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    const timersWhileMounted = vi.getTimerCount();

    unmount();

    expect(vi.getTimerCount()).toBe(timersWhileMounted - 1);
  });
});
