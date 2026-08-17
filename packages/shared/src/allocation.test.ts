import { describe, expect, it } from "vitest";

import { computeAllocation } from "./allocation";

describe("computeAllocation", () => {
  it("groups by label and sums pct to 100 across two sectors (spec AC-4)", () => {
    const result = computeAllocation([
      { label: "Financials", value: 300 },
      { label: "Utilities", value: 100 },
      { label: "Financials", value: 100 },
    ]);

    expect(result).toHaveLength(2);
    const totalPct = result.reduce((sum, slice) => sum + slice.pct, 0);
    expect(totalPct).toBeCloseTo(100);
  });

  it("gives a single holding exactly 100 pct", () => {
    const result = computeAllocation([{ label: "Financials", value: 500 }]);

    expect(result).toHaveLength(1);
    expect(result[0].pct).toBe(100);
  });

  it("sums three equal holdings to 100, not 99.99, despite the thirds rounding trap", () => {
    const result = computeAllocation([
      { label: "A", value: 100 },
      { label: "B", value: 100 },
      { label: "C", value: 100 },
    ]);

    expect(result).toHaveLength(3);
    for (const slice of result) {
      expect(slice.pct).toBeCloseTo(33.33, 1);
    }
    const totalPct = result.reduce((sum, slice) => sum + slice.pct, 0);
    expect(totalPct).toBeCloseTo(100);
  });

  it("collapses null labels into a single 'Unclassified' slice rather than dropping them", () => {
    const result = computeAllocation([
      { label: "Financials", value: 200 },
      { label: null, value: 50 },
      { label: null, value: 50 },
    ]);

    const unclassified = result.find((slice) => slice.label === "Unclassified");
    expect(unclassified).toBeDefined();
    expect(unclassified?.value).toBe(100);

    const totalValue = result.reduce((sum, slice) => sum + slice.value, 0);
    expect(totalValue).toBe(300);
  });

  it("sorts slices by value descending", () => {
    const result = computeAllocation([
      { label: "Small", value: 10 },
      { label: "Large", value: 1000 },
      { label: "Medium", value: 100 },
    ]);

    expect(result.map((slice) => slice.label)).toEqual(["Large", "Medium", "Small"]);
  });

  it("assigns the same color to a label regardless of input ordering", () => {
    const first = computeAllocation([
      { label: "Financials", value: 10 },
      { label: "Utilities", value: 20 },
    ]);
    const second = computeAllocation([
      { label: "Utilities", value: 20 },
      { label: "Financials", value: 10 },
    ]);

    const firstFinancials = first.find((slice) => slice.label === "Financials");
    const secondFinancials = second.find((slice) => slice.label === "Financials");

    expect(firstFinancials?.color).toBeDefined();
    expect(firstFinancials?.color).toBe(secondFinancials?.color);
  });

  it("returns an empty array for empty input", () => {
    expect(computeAllocation([])).toEqual([]);
  });
});
