import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceChart } from "./PerformanceChart";
import type { PortfolioValuePoint } from "../../lib/types";

function point(dateStr: string, value: number): PortfolioValuePoint {
  return { date: new Date(dateStr), value };
}

describe("PerformanceChart", () => {
  it("renders one path for a multi-point series with a command per point and no NaN", () => {
    const series: PortfolioValuePoint[] = [
      point("2026-01-01", 100),
      point("2026-01-02", 110),
      point("2026-01-03", 105),
      point("2026-01-04", 120),
    ];

    render(<PerformanceChart series={series} />);

    const path = screen.getByTestId("portfolio-line");
    const d = path.getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
    // one M (move) + one L (line) per subsequent point = series.length commands
    const commandCount = (d.match(/[ML]/g) ?? []).length;
    expect(commandCount).toBe(series.length);
  });

  it("renders two paths and a legend naming the benchmark when benchmarkSeries is given", () => {
    const series: PortfolioValuePoint[] = [
      point("2026-01-01", 100),
      point("2026-01-02", 110),
    ];
    const benchmarkSeries: PortfolioValuePoint[] = [
      point("2026-01-01", 95),
      point("2026-01-02", 98),
    ];

    render(
      <PerformanceChart
        series={series}
        benchmarkSeries={benchmarkSeries}
        benchmarkLabel="IBOVESPA"
      />,
    );

    expect(screen.getByTestId("portfolio-line")).toBeInTheDocument();
    expect(screen.getByTestId("benchmark-line")).toBeInTheDocument();
    expect(screen.getByText("IBOVESPA")).toBeInTheDocument();
  });

  it("renders only the portfolio path when benchmarkSeries is absent", () => {
    const series: PortfolioValuePoint[] = [
      point("2026-01-01", 100),
      point("2026-01-02", 110),
    ];

    render(<PerformanceChart series={series} />);

    expect(screen.getByTestId("portfolio-line")).toBeInTheDocument();
    expect(screen.queryByTestId("benchmark-line")).not.toBeInTheDocument();
  });

  it("scales both series to a shared domain, so a benchmark point above the portfolio max renders higher (smaller y) than every portfolio point", () => {
    const series: PortfolioValuePoint[] = [
      point("2026-01-01", 100),
      point("2026-01-02", 110),
      point("2026-01-03", 105),
    ];
    // benchmark's max (200) is well above the portfolio's max (110).
    const benchmarkSeries: PortfolioValuePoint[] = [
      point("2026-01-01", 150),
      point("2026-01-02", 200),
      point("2026-01-03", 170),
    ];

    render(
      <PerformanceChart
        series={series}
        benchmarkSeries={benchmarkSeries}
        benchmarkLabel="CDI"
      />,
    );

    const portfolioD = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
    const benchmarkD = screen.getByTestId("benchmark-line").getAttribute("d") ?? "";

    function yValues(d: string): number[] {
      return [...d.matchAll(/[ML]\s*[-\d.]+[, ]([-\d.]+)/g)].map((m) =>
        Number(m[1]),
      );
    }

    const portfolioYs = yValues(portfolioD);
    const benchmarkYs = yValues(benchmarkD);

    // Independent scaling would map the benchmark's own max to the chart's
    // top *and* the portfolio's own max to the chart's top too, so they'd
    // land at similar y despite the underlying values being very
    // different. With shared scaling the benchmark's max-value point (200,
    // the domain's overall max) must land strictly above (smaller y than)
    // every portfolio point.
    const benchmarkMinY = Math.min(...benchmarkYs);
    const portfolioMaxY = Math.max(...portfolioYs);
    expect(benchmarkMinY).toBeLessThan(Math.min(...portfolioYs));
    expect(benchmarkMinY).toBeLessThan(portfolioMaxY);
  });

  it("renders the empty state and no path for a zero-point series", () => {
    render(<PerformanceChart series={[]} />);

    expect(screen.queryByTestId("portfolio-line")).not.toBeInTheDocument();
    expect(screen.queryByTestId("benchmark-line")).not.toBeInTheDocument();
    expect(screen.getByTestId("performance-chart-empty")).toBeInTheDocument();
  });

  it("renders a flat path with no NaN for an all-equal series", () => {
    const series: PortfolioValuePoint[] = [
      point("2026-01-01", 100),
      point("2026-01-02", 100),
      point("2026-01-03", 100),
    ];

    render(<PerformanceChart series={series} />);

    const d = screen.getByTestId("portfolio-line").getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
    expect(d.length).toBeGreaterThan(0);
  });
});
