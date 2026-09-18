import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HoldingsGrid } from "./HoldingsGrid";
import type { HoldingWithAsset } from "../../lib/types";

function makeHolding(overrides: Partial<HoldingWithAsset> = {}): HoldingWithAsset {
  return {
    id: "holding-1",
    userId: "user-1",
    assetId: "asset-1",
    quantity: 100,
    avgPrice: 20,
    metadata: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    asset: {
      id: "asset-1",
      ticker: "PETR4",
      name: "Petrobras",
      assetType: "STOCK",
      currency: "BRL",
      exchange: "B3",
      sector: "Energy",
      subSector: null,
      investmentStyle: null,
      riskRating: null,
      currentPrice: 25,
      currentChangePct: null,
      priceUpdatedAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("HoldingsGrid", () => {
  it("renders one row per holding within a table carrying column headers", () => {
    const holdings = [
      makeHolding({ id: "h1", asset: { ...makeHolding().asset, ticker: "PETR4" } }),
      makeHolding({ id: "h2", asset: { ...makeHolding().asset, ticker: "VALE3" } }),
    ];

    render(<HoldingsGrid holdings={holdings} />);

    const table = screen.getByRole("table");
    const columnHeaders = within(table).getAllByRole("columnheader");
    expect(columnHeaders.length).toBeGreaterThan(0);

    const rows = within(screen.getByTestId("holdings-tbody")).getAllByRole("row");
    expect(rows).toHaveLength(2);
  });

  it("orders rows by descending market value", () => {
    // low: 10 * 5 = 50, mid: 10 * 50 = 500, high: 10 * 100 = 1000
    const low = makeHolding({
      id: "low",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "LOW3", currentPrice: 5 },
    });
    const mid = makeHolding({
      id: "mid",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "MID3", currentPrice: 50 },
    });
    const high = makeHolding({
      id: "high",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "HIGH3", currentPrice: 100 },
    });

    render(<HoldingsGrid holdings={[low, mid, high]} />);

    const rows = within(screen.getByTestId("holdings-tbody")).getAllByRole("row");
    expect(within(rows[0]).getByText("HIGH3")).toBeInTheDocument();
    expect(within(rows[1]).getByText("MID3")).toBeInTheDocument();
    expect(within(rows[2]).getByText("LOW3")).toBeInTheDocument();
  });

  it("sorts a holding with a null currentPrice last, even between holdings of higher and lower market value", () => {
    const low = makeHolding({
      id: "low",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "LOW3", currentPrice: 5 },
    });
    const high = makeHolding({
      id: "high",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "HIGH3", currentPrice: 100 },
    });
    const unpriced = makeHolding({
      id: "unpriced",
      quantity: 10,
      asset: { ...makeHolding().asset, ticker: "UNP3", currentPrice: null },
    });

    render(<HoldingsGrid holdings={[unpriced, low, high]} />);

    const rows = within(screen.getByTestId("holdings-tbody")).getAllByRole("row");
    expect(within(rows[0]).getByText("HIGH3")).toBeInTheDocument();
    expect(within(rows[1]).getByText("LOW3")).toBeInTheDocument();
    expect(within(rows[2]).getByText("UNP3")).toBeInTheDocument();
  });

  it("renders an empty-state message with a link to /holdings and no table body rows when there are no holdings", () => {
    render(<HoldingsGrid holdings={[]} />);

    expect(screen.queryByTestId("holdings-tbody")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const link = screen.getByRole("link", { name: /holdings/i });
    expect(link).toHaveAttribute("href", "/holdings");
  });

  it("reports the correct total count in the footer", () => {
    const holdings = [
      makeHolding({ id: "h1" }),
      makeHolding({ id: "h2" }),
      makeHolding({ id: "h3" }),
    ];

    render(<HoldingsGrid holdings={holdings} />);

    expect(screen.getByTestId("holdings-count").textContent).toContain("3");
  });
});
