import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HoldingCard } from "./HoldingCard";
import type { HoldingWithAsset } from "../../lib/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// RTL's default text normalizer collapses the non-breaking space
// `Intl.NumberFormat` puts between the currency symbol and the amount into a
// regular space before comparing node text, but a plain string matcher is
// compared as-is — so the expected string needs the same normalization.
function formatBRL(value: number): string {
  return currencyFormatter.format(value).replace(/\s/g, " ");
}

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

describe("HoldingCard", () => {
  it("renders ticker, sector, quantity, and correctly computed BRL market value and gain/loss with the positive tone for a gain", () => {
    const holding = makeHolding();
    // marketValue = 100 * 25 = 2500, costBasis = 100 * 20 = 2000, gainLoss = 500
    render(
      <table>
        <tbody>
          <HoldingCard holding={holding} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText("Energy")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(formatBRL(20))).toBeInTheDocument();
    expect(screen.getByText(formatBRL(2500))).toBeInTheDocument();

    const badge = screen.getByTestId("gain-loss-badge");
    expect(badge.firstElementChild).toHaveStyle({ color: "var(--emerald)" });
    expect(badge.textContent).toContain(currencyFormatter.format(500));
  });

  it("renders em-dashes for market value and gain/loss when currentPrice is null, but still shows quantity and average price, with no NaN or -100", () => {
    const holding = makeHolding({
      quantity: 50,
      avgPrice: 10,
      asset: {
        ...makeHolding().asset,
        currentPrice: null,
      },
    });

    render(
      <table>
        <tbody>
          <HoldingCard holding={holding} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText(formatBRL(10))).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent).not.toContain("NaN");
    expect(document.body.textContent).not.toContain("-100");
  });

  it("renders Unclassified when sector is null", () => {
    const holding = makeHolding({
      asset: {
        ...makeHolding().asset,
        sector: null,
      },
    });

    render(
      <table>
        <tbody>
          <HoldingCard holding={holding} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Unclassified")).toBeInTheDocument();
  });

  it("gives a loss-making holding the negative badge tone", () => {
    const holding = makeHolding({
      quantity: 10,
      avgPrice: 100,
      asset: {
        ...makeHolding().asset,
        currentPrice: 80,
      },
    });
    // marketValue = 800, costBasis = 1000, gainLoss = -200

    render(
      <table>
        <tbody>
          <HoldingCard holding={holding} />
        </tbody>
      </table>,
    );

    const badge = screen.getByTestId("gain-loss-badge");
    expect(badge.firstElementChild).toHaveStyle({ color: "var(--red)" });
    expect(badge.textContent).toContain(currencyFormatter.format(-200));
  });
});
