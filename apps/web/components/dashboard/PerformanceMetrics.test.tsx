import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceMetrics } from "./PerformanceMetrics";

describe("PerformanceMetrics", () => {
  it("renders all four metrics with their labels and percentage formatting (fraction * 100, one decimal, % suffix)", () => {
    render(
      <PerformanceMetrics
        cagr={0.123}
        volatility={0.185}
        maxDrawdown={0.067}
        vsBenchmarkPct={0.042}
      />,
    );

    expect(screen.getByText("CAGR")).toBeInTheDocument();
    expect(screen.getByText("12.3%")).toBeInTheDocument();

    expect(screen.getByText("Volatility")).toBeInTheDocument();
    expect(screen.getByText("18.5%")).toBeInTheDocument();

    expect(screen.getByText("Max Drawdown")).toBeInTheDocument();
    expect(screen.getByText("-6.7%")).toBeInTheDocument();

    expect(screen.getByText("vs. Benchmark")).toBeInTheDocument();
    expect(screen.getByText("4.2%")).toBeInTheDocument();
  });

  it("renders maxDrawdown with the negative tone and a minus sign, whatever sign the API sends", () => {
    render(
      <PerformanceMetrics
        cagr={0.1}
        volatility={0.1}
        maxDrawdown={0.067}
        vsBenchmarkPct={0}
      />,
    );

    const drawdownValue = screen.getByTestId("max-drawdown-value");
    expect(drawdownValue.textContent).toBe("-6.7%");
    expect(
      screen.getByTestId("max-drawdown-badge").firstElementChild,
    ).toHaveStyle({ color: "var(--red)" });
  });

  it("gives a positive vsBenchmarkPct the positive tone and a negative one the negative tone", () => {
    const { rerender } = render(
      <PerformanceMetrics
        cagr={0.1}
        volatility={0.1}
        maxDrawdown={0}
        vsBenchmarkPct={0.05}
      />,
    );
    expect(
      screen.getByTestId("vs-benchmark-badge").firstElementChild,
    ).toHaveStyle({ color: "var(--emerald)" });

    rerender(
      <PerformanceMetrics
        cagr={0.1}
        volatility={0.1}
        maxDrawdown={0}
        vsBenchmarkPct={-0.05}
      />,
    );
    expect(
      screen.getByTestId("vs-benchmark-badge").firstElementChild,
    ).toHaveStyle({ color: "var(--red)" });
  });

  it("renders an em-dash and no tone when vsBenchmarkPct is omitted (no benchmark requested)", () => {
    render(<PerformanceMetrics cagr={0.1} volatility={0.1} maxDrawdown={0} />);

    expect(screen.getByTestId("vs-benchmark-value").textContent).toBe("—");
    expect(screen.queryByTestId("vs-benchmark-badge")).not.toBeInTheDocument();
  });

  it("renders 0.0% values with no NaN anywhere for an all-zero response", () => {
    render(
      <PerformanceMetrics
        cagr={0}
        volatility={0}
        maxDrawdown={0}
        vsBenchmarkPct={0}
      />,
    );

    expect(screen.getAllByText("0.0%").length).toBe(4);
    expect(document.body.textContent).not.toContain("NaN");
  });
});
