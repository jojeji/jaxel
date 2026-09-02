import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createNode } from "@jaxel/core";
import { I18nProvider } from "../i18n/index.js";
import { TreeView } from "./TreeView.js";
import type { TreeRow } from "./flatten.js";

afterEach(cleanup);

describe("TreeView scroll layout", () => {
  it("leaves one row of scroll space below the final XML element", () => {
    const node = createNode({
      name: "a-very-wide-element-name-that-forces-horizontal-scrolling",
      value: "content",
    });
    const rows: TreeRow[] = [{ node, ancestors: [], depth: 0, hasChildren: false }];
    const noop = vi.fn();

    const { container } = render(
      <I18nProvider>
        <div style={{ display: "flex", width: 180, height: 66 }}>
          <TreeView
            rows={rows}
            expanded={new Set()}
            selectedIds={new Set()}
            onToggle={noop}
            onSelect={noop}
            editingField={null}
            onStartEditName={noop}
            onStartEditValue={noop}
            onCommitEdit={noop}
            onCancelEdit={noop}
            onRowContextMenu={noop}
            onMoveNode={noop}
            onDecodeBase64={noop}
          />
        </div>
      </I18nProvider>,
    );

    const spacer = container.querySelector<HTMLElement>(".tree-view__spacer");
    const finalRow = container.querySelector<HTMLElement>(".tree-row");
    expect(spacer).not.toBeNull();
    expect(finalRow).not.toBeNull();
    expect(spacer!.getBoundingClientRect().bottom - finalRow!.getBoundingClientRect().bottom).toBe(
      finalRow!.getBoundingClientRect().height,
    );
  });
});
