import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllocationLegend } from "./AllocationLegend";
import type { AllocationSlice } from "../../lib/types";

function slice(label: string, value: number, pct: number, color: string): AllocationSlice {
  return { label, value, pct, color };
}

function makeSlices(count: number): AllocationSlice[] {
  return Array.from({ length: count }, (_, index) =>
    slice(`Slice ${index + 1}`, 100, 100 / count, "#2563eb"),
  );
}

describe("AllocationLegend", () => {
  it("renders every row and no toggle when there are 5 or fewer slices", () => {
    render(<AllocationLegend slices={makeSlices(5)} />);

    expect(screen.getAllByTestId("legend-row")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /view more/i })).not.toBeInTheDocument();
  });

  it('caps the list at 5 rows and shows "View more" when there are more than 5 slices', () => {
    render(<AllocationLegend slices={makeSlices(7)} />);

    expect(screen.getAllByTestId("legend-row")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /view more/i })).toBeInTheDocument();
  });

  it('expands to show every row and flips to "View less" on click', async () => {
    const user = userEvent.setup();
    render(<AllocationLegend slices={makeSlices(7)} />);

    await user.click(screen.getByRole("button", { name: /view more/i }));

    expect(screen.getAllByTestId("legend-row")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /view less/i })).toBeInTheDocument();
  });

  it("collapses back to 5 rows when View less is clicked", async () => {
    const user = userEvent.setup();
    render(<AllocationLegend slices={makeSlices(7)} />);

    await user.click(screen.getByRole("button", { name: /view more/i }));
    await user.click(screen.getByRole("button", { name: /view less/i }));

    expect(screen.getAllByTestId("legend-row")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /view more/i })).toBeInTheDocument();
  });
});
