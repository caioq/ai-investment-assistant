import { Card } from "../ui/Card";
import { Badge, type BadgeTone } from "../ui/Badge";

export interface PerformanceMetricsProps {
  /** Fraction, e.g. `0.123` for 12.3% (see `packages/shared/src/metrics.ts`). */
  cagr: number;
  /** Fraction, e.g. `0.185` for 18.5%. */
  volatility: number;
  /** A positive fraction (a loss), e.g. `0.067` for a 6.7% drawdown. */
  maxDrawdown: number;
  /**
   * Fraction, e.g. `0.042` for +4.2%. Omitted (undefined) when no benchmark
   * was requested — distinct from a computed `0`.
   */
  vsBenchmarkPct?: number;
  /** Label for the benchmark this metric is measured against, taken from the caller. */
  benchmarkLabel?: string;
}

/**
 * Formats a wire-format fraction (`0.123` → `"12.3%"`) with one decimal
 * place. `packages/shared/src/metrics.ts`'s helpers return `0` (never
 * `NaN`) for a series shorter than two points, so a brand-new portfolio
 * legitimately formats to `"0.0%"` here rather than an error state.
 */
function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

function signedTone(fraction: number): BadgeTone {
  if (fraction > 0) return "positive";
  if (fraction < 0) return "negative";
  return "neutral";
}

/**
 * The stat strip beside `PerformanceChart`: CAGR, volatility, max drawdown,
 * and performance vs. the selected benchmark — all read straight off
 * `GET /portfolio/performance`'s response fields, never recomputed in the
 * browser (`packages/shared/src/metrics.ts` already owns the maths).
 */
export function PerformanceMetrics({
  cagr,
  volatility,
  maxDrawdown,
  vsBenchmarkPct,
  benchmarkLabel,
}: PerformanceMetricsProps) {
  const hasVsBenchmark = vsBenchmarkPct !== undefined;
  const vsBenchmarkTone = hasVsBenchmark ? signedTone(vsBenchmarkPct) : "neutral";
  // maxDrawdown is documented as "a positive fraction" — force a minus
  // prefix (but not on an exact 0, which has no sign to show) regardless
  // of the sign the API actually sends.
  const drawdownTone: BadgeTone = maxDrawdown > 0 ? "negative" : "neutral";
  const drawdownText =
    maxDrawdown === 0 ? formatPct(0) : `-${formatPct(Math.abs(maxDrawdown))}`;

  return (
    <Card title="Performance metrics">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
            CAGR
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatPct(cagr)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
            since first snapshot
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
            Volatility
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatPct(volatility)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
            annualised, since first snapshot
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
            Max Drawdown
          </div>
          <div style={{ marginTop: 4 }} data-testid="max-drawdown-badge">
            <Badge tone={drawdownTone}>
              <span data-testid="max-drawdown-value">{drawdownText}</span>
            </Badge>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
            peak-to-trough, since first snapshot
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
            vs. Benchmark
          </div>
          {hasVsBenchmark ? (
            <div style={{ marginTop: 4 }} data-testid="vs-benchmark-badge">
              <Badge tone={vsBenchmarkTone}>
                <span data-testid="vs-benchmark-value">
                  {formatPct(vsBenchmarkPct)}
                </span>
              </Badge>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              <span
                data-testid="vs-benchmark-value"
                style={{ color: "var(--text-tertiary)" }}
              >
                —
              </span>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
            since first snapshot{benchmarkLabel ? ` vs. ${benchmarkLabel}` : ""}
          </div>
        </div>
      </div>
    </Card>
  );
}
