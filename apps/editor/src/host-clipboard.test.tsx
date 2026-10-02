import { afterEach, describe, expect, it, vi } from "vitest";

const plugin = vi.hoisted(() => ({ readText: vi.fn<() => Promise<string>>() }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => plugin);

import { getJaxelHost } from "./host.js";

// The standalone host reads the clipboard through the Tauri plugin (the WebView's own API may
// be restricted in WebKitGTK) and only falls back to the WebView when the plugin fails.
describe("Zwischenablage lesen (Standalone-Host)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("liest über das Tauri-Plugin", async () => {
    plugin.readText.mockResolvedValueOnce("<aus-plugin/>");
    const webView = vi.spyOn(navigator.clipboard, "readText");
    expect(await getJaxelHost().readClipboardText()).toBe("<aus-plugin/>");
    expect(webView).not.toHaveBeenCalled();
  });

  it("fällt auf die WebView-Zwischenablage zurück, wenn das Plugin scheitert", async () => {
    plugin.readText.mockRejectedValueOnce(new Error("not in a Tauri window"));
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValueOnce("<aus-webview/>");
    expect(await getJaxelHost().readClipboardText()).toBe("<aus-webview/>");
  });
});
