import { Badge } from "../ui/Badge";

export interface PortfolioHeaderProps {
  userName: string;
  currentValue: number;
  /**
   * `value[n] - value[n-1]` of the last two points of
   * `GET /portfolio/performance`. `null` when the series has fewer than two
   * points (a brand-new portfolio, or one whose first snapshot ran today) —
   * there is no daily change to report, distinct from a flat `0`.
   */
  dayChange: number | null;
  dayChangePct: number | null;
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

export function PortfolioHeader({
  userName,
  currentValue,
  dayChange,
  dayChangePct,
}: PortfolioHeaderProps) {
  const hasDayChange = dayChange !== null && dayChangePct !== null;
  const isPositive = hasDayChange && dayChange >= 0;

  return (
    <section
      style={{
        background:
          "linear-gradient(155deg, var(--navy) 0%, var(--navy-2) 100%)",
        borderRadius: 20,
        padding: "80px 36px",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Hello, {userName} · Total portfolio value
      </div>
      <div
        style={{
          fontSize: 46,
          fontWeight: 600,
          color: "#fff",
          letterSpacing: "-0.02em",
          marginTop: 6,
        }}
      >
        {currencyFormatter.format(currentValue)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
        }}
      >
        {hasDayChange ? (
          <span data-testid="day-change-badge">
            <Badge tone={isPositive ? "positive" : "negative"}>
              {isPositive ? "↑" : "↓"} {currencyFormatter.format(dayChange)} (
              {percentFormatter.format(dayChangePct / 100)})
            </Badge>
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.5)" }}>—</span>
        )}
        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
          since last close
        </span>
      </div>
    </section>
  );
}
