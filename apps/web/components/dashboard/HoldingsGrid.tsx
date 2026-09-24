import Link from "next/link";
import { Card } from "../ui/Card";
import { HoldingCard } from "./HoldingCard";
import type { HoldingWithAsset } from "../../lib/types";

export interface HoldingsGridProps {
  holdings: HoldingWithAsset[];
}

/**
 * Sort key for market value, used for the descending sort below. A holding
 * with `asset.currentPrice: null` has no computable market value (a failed
 * refresh, or a ticker added before its first quote) — comparing `null`
 * numerically is undefined, so it's explicitly given `-Infinity` here rather
 * than falling back to `0`, which would misplace it relative to a real
 * (rare, but valid) zero-value holding. `-Infinity` guarantees it always
 * sorts after every priced holding, however small.
 */
function marketValueSortKey(holding: HoldingWithAsset): number {
  const { currentPrice } = holding.asset;
  if (currentPrice === null) return -Infinity;
  return holding.quantity * currentPrice;
}

const columns = [
  "Ticker",
  "Sector",
  "Quantity",
  "Avg. Price",
  "Current Price",
  "Market Value",
  "Gain/Loss",
];

/**
 * The holdings panel: a header row, one `HoldingCard` row per holding sorted
 * by market value descending (unpriced holdings sort last, see
 * `marketValueSortKey`), and a footer count. Presentational only — rows are
 * supplied as a prop, no fetching here.
 */
export function HoldingsGrid({ holdings }: HoldingsGridProps) {
  if (holdings.length === 0) {
    return (
      <Card title="Holdings">
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            color: "var(--text-tertiary)",
          }}
        >
          <p style={{ marginBottom: 12 }}>You don&apos;t have any holdings yet.</p>
          <Link href="/data-sources" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Import your holdings
          </Link>
        </div>
      </Card>
    );
  }

  const sortedHoldings = [...holdings].sort(
    (a, b) => marketValueSortKey(b) - marketValueSortKey(a),
  );

  return (
    <Card title="Holdings">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody data-testid="holdings-tbody">
          {sortedHoldings.map((holding) => (
            <HoldingCard key={holding.id} holding={holding} />
          ))}
        </tbody>
      </table>
      <div
        data-testid="holdings-count"
        style={{
          marginTop: 12,
          fontSize: 13,
          color: "var(--text-tertiary)",
        }}
      >
        {holdings.length} holding{holdings.length === 1 ? "" : "s"}
      </div>
    </Card>
  );
}
