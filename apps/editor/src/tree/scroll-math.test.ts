import { describe, expect, it } from "vitest";
import { computeAnchoredScrollTop, computeRevealScrollTop } from "./scroll-math.js";

describe("computeAnchoredScrollTop", () => {
  it("keeps the row at the same pixel offset within the viewport", () => {
    expect(computeAnchoredScrollTop(10, 44, 22)).toBe(176); // 10*22 - 44
  });

  it("clamps to 0 instead of going negative", () => {
    expect(computeAnchoredScrollTop(0, 100, 22)).toBe(0);
  });
});

describe("computeRevealScrollTop", () => {
  it("returns the current scrollTop unchanged when the row is already fully visible", () => {
    // row 5 spans [110, 132), viewport [0, 200)
    expect(computeRevealScrollTop(5, 22, 0, 200)).toBe(0);
  });

  it("centers the row in the viewport when it's above the visible range", () => {
    // row 0 spans [0, 22), viewport currently [500, 700)
    expect(computeRevealScrollTop(0, 22, 500, 200)).toBe(0); // Math.max(0, 0 - 100)
  });

  it("centers the row in the viewport when it's below the visible range", () => {
    // row 100 spans [2200, 2222), viewport currently [0, 200)
    expect(computeRevealScrollTop(100, 22, 0, 200)).toBe(2100); // 2200 - 100
  });
});
