import { describe, expect, it } from "vitest";

import { cagr, maxDrawdown, volatility } from "./metrics";
import type { PortfolioValuePoint } from "./metrics";

function series(values: number[], dates: Date[]): PortfolioValuePoint[] {
  return values.map((value, i) => ({ date: dates[i], value }));
}

/**
 * Generates `count` weekday-only dates starting from `start` (inclusive),
 * with `value` interpolated linearly from `firstValue` to `lastValue` —
 * mirrors how PortfolioValueSnapshot rows are actually populated (one per
 * weekday, never weekends).
 */
function generateWeekdaySeries(
  start: Date,
  count: number,
  firstValue: number,
  lastValue: number,
): PortfolioValuePoint[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates.map((date, i) => ({
    date,
    value: firstValue + ((lastValue - firstValue) * i) / (count - 1),
  }));
}

describe("cagr", () => {
  it("computes 100 -> 121 over exactly two years as 0.10", () => {
    const s = series([100, 121], [new Date("2020-01-01"), new Date("2022-01-01")]);
    expect(cagr(s)).toBeCloseTo(0.1);
  });

  it("uses actual elapsed calendar days, not point count, on a weekday-only series", () => {
    // ~252 weekday points span ~351 calendar days here, not 252 or 365 —
    // a points-counting implementation would compute years = 252 / 365.25
    // (~0.69) and produce cagr ≈ 0.148, not ≈ 0.10.
    const s = generateWeekdaySeries(new Date("2023-01-02"), 252, 100, 110);

    const result = cagr(s);

    expect(result).toBeCloseTo(0.1, 1);
    expect(Math.abs(result - 0.145)).toBeGreaterThan(0.02);
  });

  it("returns 0 when the first value is 0", () => {
    const s = series([0, 100], [new Date("2020-01-01"), new Date("2021-01-01")]);
    expect(cagr(s)).toBe(0);
  });

  it("returns 0 for an empty series", () => {
    expect(cagr([])).toBe(0);
  });

  it("returns 0 for a single-point series", () => {
    const s = series([100], [new Date("2020-01-01")]);
    expect(cagr(s)).toBe(0);
  });
});

describe("maxDrawdown", () => {
  it("is exactly 0 for a strictly increasing series", () => {
    const s = series(
      [100, 110, 120, 130, 140],
      [
        new Date("2023-01-01"),
        new Date("2023-01-02"),
        new Date("2023-01-03"),
        new Date("2023-01-04"),
        new Date("2023-01-05"),
      ],
    );
    expect(maxDrawdown(s)).toBe(0);
  });

  it("finds the peak-to-trough decline, not first-value-to-trough", () => {
    // Peak (120) precedes the true trough (60); (max - min) / max over the
    // whole series would wrongly give (140... ) no — it would give
    // (first - trough) / first = (100 - 60) / 100 = 0.4 instead of 0.5.
    const s = series(
      [100, 120, 60, 90],
      [
        new Date("2023-01-01"),
        new Date("2023-01-02"),
        new Date("2023-01-03"),
        new Date("2023-01-04"),
      ],
    );
    expect(maxDrawdown(s)).toBeCloseTo(0.5);
  });

  it("returns 0 for an empty series", () => {
    expect(maxDrawdown([])).toBe(0);
  });

  it("returns 0 for a single-point series", () => {
    const s = series([100], [new Date("2020-01-01")]);
    expect(maxDrawdown(s)).toBe(0);
  });
});

describe("volatility", () => {
  it("is 0 for a flat series", () => {
    const s = series(
      [100, 100, 100, 100],
      [
        new Date("2023-01-01"),
        new Date("2023-01-02"),
        new Date("2023-01-03"),
        new Date("2023-01-04"),
      ],
    );
    expect(volatility(s)).toBe(0);
  });

  it("matches a hand-computed annualised figure on a known-variance series", () => {
    // Daily returns: +10%, -9.0909...%, +10%, -9.0909...% (sample stdev,
    // annualised by sqrt(252)) hand-computed to ≈ 1.7497.
    const s = series(
      [100, 110, 100, 110, 100],
      [
        new Date("2023-01-01"),
        new Date("2023-01-02"),
        new Date("2023-01-03"),
        new Date("2023-01-04"),
        new Date("2023-01-05"),
      ],
    );
    expect(volatility(s)).toBeCloseTo(1.7497, 3);
  });

  it("returns 0 for an empty series", () => {
    expect(volatility([])).toBe(0);
  });

  it("returns 0 for a single-point series", () => {
    const s = series([100], [new Date("2020-01-01")]);
    expect(volatility(s)).toBe(0);
  });
});
