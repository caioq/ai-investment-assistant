import { Badge, type BadgeTone } from "../ui/Badge";
import type { HoldingWithAsset } from "../../lib/types";

export interface HoldingCardProps {
  holding: HoldingWithAsset;
}

const EM_DASH = "—";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function gainLossTone(gainLoss: number): BadgeTone {
  if (gainLoss > 0) return "positive";
  if (gainLoss < 0) return "negative";
  return "neutral";
}

/**
 * One row of the holdings table: ticker, sector, quantity, average price,
 * current price, market value, and gain/loss as a toned badge.
 *
 * `asset.currentPrice` is nullable (failed refresh leaves the last-known
 * value rather than 0, or the asset was never priced yet) — market value
 * and gain/loss render as an em-dash rather than treating the missing price
 * as 0, which would otherwise report a fake 100% loss on the position.
 */
export function HoldingCard({ holding }: HoldingCardProps) {
  const { asset, quantity, avgPrice } = holding;
  const sector = asset.sector ?? "Unclassified";

  const hasPrice = asset.currentPrice !== null;
  const marketValue = hasPrice ? quantity * (asset.currentPrice as number) : null;
  const costBasis = quantity * avgPrice;
  const gainLoss = marketValue !== null ? marketValue - costBasis : null;

  return (
    <tr>
      <td>{asset.ticker}</td>
      <td>{sector}</td>
      <td>{quantity}</td>
      <td>{currencyFormatter.format(avgPrice)}</td>
      <td>{hasPrice ? currencyFormatter.format(asset.currentPrice as number) : EM_DASH}</td>
      <td>{marketValue !== null ? currencyFormatter.format(marketValue) : EM_DASH}</td>
      <td data-testid="gain-loss-badge">
        {gainLoss !== null ? (
          <Badge tone={gainLossTone(gainLoss)}>{currencyFormatter.format(gainLoss)}</Badge>
        ) : (
          EM_DASH
        )}
      </td>
    </tr>
  );
}
