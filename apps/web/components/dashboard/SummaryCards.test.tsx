import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCards } from "./SummaryCards";
import type { PortfolioSummary } from "../../lib/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number): string {
  return currencyFormatter.format(value).replace(/\s/g, " ");
}

describe("SummaryCards", () => {
  it("renders all three cards with BRL-formatted values from a populated summary", () => {
    const summary: PortfolioSummary = {
      totalInvested: 100000,
      currentValue: 112000,
      gainLoss: 12000,
      returnPct: 12,
    };

    render(<SummaryCards summary={summary} holdingsCount={7} />);

    expect(
      screen.getByText(formatBRL(12000)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatBRL(100000)),
    ).toBeInTheDocument();
    expect(screen.getByText("Cost basis")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("gives a negative gainLoss the negative badge tone and a positive one the positive tone", () => {
    const negativeSummary: PortfolioSummary = {
      totalInvested: 100000,
      currentValue: 90000,
      gainLoss: -10000,
      returnPct: -10,
    };

    const { rerender } = render(
      <SummaryCards summary={negativeSummary} holdingsCount={3} />,
    );
    expect(
      screen.getByTestId("return-badge").firstElementChild,
    ).toHaveStyle({
      color: "var(--red)",
    });

    const positiveSummary: PortfolioSummary = {
      totalInvested: 100000,
      currentValue: 110000,
      gainLoss: 10000,
      returnPct: 10,
    };

    rerender(<SummaryCards summary={positiveSummary} holdingsCount={3} />);
    expect(
      screen.getByTestId("return-badge").firstElementChild,
    ).toHaveStyle({
      color: "var(--emerald)",
    });
  });

  it("renders three cards with a neutral tone and no NaN/Infinity for an all-zero summary", () => {
    const zeroSummary: PortfolioSummary = {
      totalInvested: 0,
      currentValue: 0,
      gainLoss: 0,
      returnPct: 0,
    };

    render(<SummaryCards summary={zeroSummary} holdingsCount={0} />);

    expect(
      screen.getByTestId("return-badge").firstElementChild,
    ).toHaveStyle({
      color: "var(--text-tertiary)",
    });
    expect(screen.getAllByText(formatBRL(0)).length).toBe(2);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("NaN");
    expect(document.body.textContent).not.toContain("Infinity");
  });
});
