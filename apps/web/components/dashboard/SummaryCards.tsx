import { Card } from "../ui/Card";
import { Badge, type BadgeTone } from "../ui/Badge";
import type { PortfolioSummary } from "../../lib/types";

export interface SummaryCardsProps {
  summary: PortfolioSummary;
  holdingsCount: number;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function returnTone(returnPct: number): BadgeTone {
  if (returnPct > 0) return "positive";
  if (returnPct < 0) return "negative";
  return "neutral";
}

export function SummaryCards({ summary, holdingsCount }: SummaryCardsProps) {
  const { totalInvested, gainLoss, returnPct } = summary;
  const tone = returnTone(returnPct);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <Card title="Total return">
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          {currencyFormatter.format(gainLoss)}
        </div>
        <div style={{ marginTop: 8 }} data-testid="return-badge">
          <Badge tone={tone}>{percentFormatter.format(returnPct / 100)}</Badge>
        </div>
      </Card>

      <Card title="Total invested">
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          {currencyFormatter.format(totalInvested)}
        </div>
        <div style={{ color: "var(--text-tertiary)", marginTop: 8 }}>
          Cost basis
        </div>
      </Card>

      <Card title="Holdings">
        <div style={{ fontSize: 28, fontWeight: 700 }}>{holdingsCount}</div>
      </Card>
    </div>
  );
}
