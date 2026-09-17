import { Card } from "../ui/Card";
import type { PortfolioValuePoint } from "../../lib/types";

export interface PerformanceChartProps {
  series: PortfolioValuePoint[];
  benchmarkSeries?: PortfolioValuePoint[];
  benchmarkLabel?: string;
}

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 220;
const GRADIENT_ID = "performanceChartFill";

/**
 * Maps a series to `[x, y]` SVG coordinate pairs against a **given**
 * `[min, max]` domain (never the series' own min/max — see
 * `buildLinePath`'s caller, which always passes the combined domain of
 * both series so the portfolio and benchmark lines share one scale).
 *
 * `min === max` (a single point, or every value in the series identical)
 * would divide by zero in a naive `(v - min) / (max - min)` and put `NaN`
 * into the path's `d` attribute, so that case is special-cased to render
 * flat at vertical-center instead.
 */
function toCoordinates(
  series: PortfolioValuePoint[],
  min: number,
  max: number,
): [number, number][] {
  const range = max - min;
  const stepX =
    series.length > 1 ? VIEWBOX_WIDTH / (series.length - 1) : 0;

  return series.map((point, index) => {
    const x = series.length > 1 ? index * stepX : 0;
    const y =
      range === 0
        ? VIEWBOX_HEIGHT / 2
        : VIEWBOX_HEIGHT - ((point.value - min) / range) * VIEWBOX_HEIGHT;
    return [x, y];
  });
}

function buildLinePath(coordinates: [number, number][]): string {
  if (coordinates.length === 0) return "";
  if (coordinates.length === 1) {
    const [[, y]] = coordinates;
    // A flat baseline spanning the full width, not a zero-length path.
    return `M0,${y} L${VIEWBOX_WIDTH},${y}`;
  }
  return coordinates
    .map((coordinate, index) => {
      const [x, y] = coordinate;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(coordinates: [number, number][]): string {
  if (coordinates.length === 0) return "";
  const line = buildLinePath(coordinates);
  const lastX =
    coordinates.length === 1 ? VIEWBOX_WIDTH : coordinates[coordinates.length - 1][0];
  const firstX = 0;
  return `${line} L${lastX},${VIEWBOX_HEIGHT} L${firstX},${VIEWBOX_HEIGHT} Z`;
}

/**
 * Hand-rolled SVG line chart with an area fill under the portfolio line,
 * mirroring the mockup's technique (`resources/UI/portfolio-dashboard.html`
 * line 178) — no charting library (spec Non-Goal). Presentational only:
 * the range toggle and re-fetching live in `US-4_T-2`.
 */
export function PerformanceChart({
  series,
  benchmarkSeries,
  benchmarkLabel,
}: PerformanceChartProps) {
  if (series.length === 0) {
    return (
      <Card title="Portfolio performance">
        <div
          data-testid="performance-chart-empty"
          style={{
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 13,
            padding: "40px 0",
          }}
        >
          No performance data yet
        </div>
      </Card>
    );
  }

  const hasBenchmark = !!benchmarkSeries && benchmarkSeries.length > 0;

  // Combined min/max across both series, so the two lines are scaled to
  // one shared domain rather than crossing where the underlying numbers
  // never did.
  const allValues = [
    ...series.map((point) => point.value),
    ...(hasBenchmark ? benchmarkSeries!.map((point) => point.value) : []),
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  const portfolioCoordinates = toCoordinates(series, min, max);
  const portfolioLinePath = buildLinePath(portfolioCoordinates);
  const portfolioAreaPath = buildAreaPath(portfolioCoordinates);

  const benchmarkLinePath = hasBenchmark
    ? buildLinePath(toCoordinates(benchmarkSeries!, min, max))
    : "";

  return (
    <Card title="Portfolio performance">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 3,
              borderRadius: 2,
              background: "var(--blue)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Portfolio
          </span>
        </div>
        {hasBenchmark ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                background: "var(--text-tertiary)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {benchmarkLabel}
            </span>
          </div>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 220, display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {hasBenchmark ? (
          <path
            data-testid="benchmark-line"
            d={benchmarkLinePath}
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth={2}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <path d={portfolioAreaPath} fill={`url(#${GRADIENT_ID})`} opacity={0.5} />

        <path
          data-testid="portfolio-line"
          d={portfolioLinePath}
          fill="none"
          stroke="var(--blue)"
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Card>
  );
}
