import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AllocationDonut } from "./AllocationDonut";
import type { AllocationSlice } from "../../lib/types";

function slice(
  label: string,
  value: number,
  pct: number,
  color: string,
): AllocationSlice {
  return { label, value, pct, color };
}

describe("AllocationDonut", () => {
  it("renders a single 0-100% conic-gradient stop and one legend row for one slice", () => {
    const slices = [slice("Financials", 1000, 100, "#2563eb")];

    render(
      <AllocationDonut
        title="By sector"
        slices={slices}
        centerLabel="Invested"
        centerSubLabel="R$ 1,000"
      />,
    );

    const ring = screen.getByTestId("donut-ring");
    const background = ring.style.background;
    expect(background).toContain("conic-gradient(");
    expect(background).toContain("rgb(37, 99, 235) 0%");
    expect(background).toContain("rgb(37, 99, 235) 100%");

    expect(screen.getAllByTestId("legend-row")).toHaveLength(1);
    expect(screen.getByText("Financials")).toBeInTheDocument();
  });

  it("renders one legend row per slice, in order, each with its own color in the gradient and swatch, and the final stop pinned at 100%", () => {
    const slices = [
      slice("Financials", 100, 33.333333, "#2563eb"),
      slice("Energy", 100, 33.333333, "#16a34a"),
      slice("Utilities", 100, 33.333333, "#d97706"),
    ];

    render(
      <AllocationDonut
        title="By sector"
        slices={slices}
        centerLabel="Invested"
        centerSubLabel="R$ 300"
      />,
    );

    const ring = screen.getByTestId("donut-ring");
    const background = ring.style.background;
    expect(background).toContain("rgb(37, 99, 235)");
    expect(background).toContain("rgb(22, 163, 74)");
    expect(background).toContain("rgb(217, 119, 6)");
    expect(background.trim().endsWith(")")).toBe(true);
    expect(background).toMatch(/100%\)$/);

    const rows = screen.getAllByTestId("legend-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Financials");
    expect(rows[1]).toHaveTextContent("Energy");
    expect(rows[2]).toHaveTextContent("Utilities");

    const swatches = screen.getAllByTestId("legend-swatch");
    expect(swatches[0]).toHaveStyle({ background: "#2563eb" });
    expect(swatches[1]).toHaveStyle({ background: "#16a34a" });
    expect(swatches[2]).toHaveStyle({ background: "#d97706" });
  });

  it("renders an empty-state message and a neutral ring for an empty slices array, without emitting an invalid zero-stop conic-gradient", () => {
    expect(() =>
      render(
        <AllocationDonut
          title="By sector"
          slices={[]}
          centerLabel="Invested"
          centerSubLabel="R$ 0"
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText(/no holdings yet/i)).toBeInTheDocument();
    const ring = screen.getByTestId("donut-ring");
    expect(ring.style.background).not.toContain("conic-gradient(");
    expect(screen.queryAllByTestId("legend-row")).toHaveLength(0);
  });

  it("renders identically for a risk-rating title with different slices, proving nothing is sector-specific", () => {
    const styleSlices = [
      slice("Growth", 600, 60, "#2563eb"),
      slice("Value", 400, 40, "#16a34a"),
    ];

    render(
      <AllocationDonut
        title="By investment style"
        slices={styleSlices}
        centerLabel="Invested"
        centerSubLabel="R$ 1,000"
      />,
    );

    expect(screen.getByText("By investment style")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain("sector");

    const riskSlices = [
      slice("Low", 300, 30, "#2563eb"),
      slice("Medium", 500, 50, "#16a34a"),
      slice("High", 200, 20, "#d97706"),
    ];

    render(
      <AllocationDonut
        title="By risk rating"
        slices={riskSlices}
        centerLabel="Invested"
        centerSubLabel="R$ 1,000"
      />,
    );

    expect(screen.getByText("By risk rating")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
