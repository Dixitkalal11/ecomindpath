import { describe, it, expect } from "vitest";
import { vsAveragePct, vsAverageLabel } from "./comparisons";

describe("vsAveragePct — percentage vs regional/global average", () => {
  it("returns 0 when average is zero or negative (no division by zero)", () => {
    expect(vsAveragePct(50, 0)).toBe(0);
    expect(vsAveragePct(50, -10)).toBe(0);
  });

  it("returns a negative percent when user is below average", () => {
    expect(vsAveragePct(80, 100)).toBe(-20);
  });

  it("returns a positive percent when user is above average", () => {
    expect(vsAveragePct(150, 100)).toBe(50);
  });

  it("returns 0 when user equals average", () => {
    expect(vsAveragePct(100, 100)).toBe(0);
  });

  it("clamps negative user values to zero before comparing", () => {
    expect(vsAveragePct(-50, 100)).toBe(-100);
  });

  it("ignores non-finite inputs gracefully", () => {
    expect(vsAveragePct(NaN, 100)).toBe(0);
    expect(vsAveragePct(50, Infinity)).toBe(0);
  });
});

describe("vsAverageLabel", () => {
  it("phrases above-average correctly", () => {
    expect(vsAverageLabel(150, 100)).toMatch(/above average/);
  });
  it("phrases below-average correctly", () => {
    expect(vsAverageLabel(50, 100)).toMatch(/below average/);
  });
  it("returns 'on par' when equal", () => {
    expect(vsAverageLabel(100, 100)).toBe("on par with average");
  });
  it("returns 'no benchmark available' when average is missing", () => {
    expect(vsAverageLabel(100, 0)).toBe("no benchmark available");
  });
});
