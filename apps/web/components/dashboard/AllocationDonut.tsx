import { Card } from "../ui/Card";
import type { AllocationSlice } from "../../lib/types";

export interface AllocationDonutProps {
  title: string;
  slices: AllocationSlice[];
  centerLabel: string;
  centerSubLabel: string;
}

const NEUTRAL_RING_COLOR = "var(--border)";

const valueFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const pctFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Builds a CSS `conic-gradient(...)` background from slices, accumulating
 * each slice's `pct` into running from/to stops. Two edge cases are handled
 * deliberately (see the task's own AC):
 * - a single slice still needs an explicit `0% 100%` stop, not an offset
 *   built from `slices.slice(1)` (which would render nothing);
 * - the final stop is pinned to exactly `100%` rather than the accumulated
 *   float total, since summing `pct` across ~30 slices can leave a
 *   hairline gap short of 100% from floating-point drift.
 */
function buildGradient(slices: AllocationSlice[]): string {
  if (slices.length === 1) {
    // A single color-stop with two positions (`color 0% 100%`) is valid CSS
    // for a full-turn ring, but two single-position stops of the same
    // color are equivalent and parse more reliably across engines/test
    // environments — so the one-slice case is built this way rather than
    // via the multi-stop accumulation below (which would emit nothing for
    // a `slices.slice(1)`-style offset build).
    const [slice] = slices;
    return `conic-gradient(${slice.color} 0%, ${slice.color} 100%)`;
  }

  let acc = 0;
  const stops = slices.map((slice, index) => {
    const from = acc;
    acc += slice.pct;
    const to = index === slices.length - 1 ? 100 : acc;
    return `${slice.color} ${from}% ${to}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

/**
 * Reusable allocation donut: the same component serves sector, stock,
 * investment-style, risk-rating and (later) asset-class breakdowns — only
 * `slices`/`title`/`centerLabel`/`centerSubLabel` change, nothing here is
 * sector-specific.
 *
 * Rendered with CSS `conic-gradient`, not a charting library (spec
 * Non-Goal). An empty `slices` array can't produce a `conic-gradient()`
 * with zero stops — that's invalid CSS and would take down the whole
 * panel — so it renders a neutral grey ring and an empty-state message
 * instead.
 */
export function AllocationDonut({
  title,
  slices,
  centerLabel,
  centerSubLabel,
}: AllocationDonutProps) {
  const isEmpty = slices.length === 0;
  const ringBackground = isEmpty ? NEUTRAL_RING_COLOR : buildGradient(slices);

  return (
    <Card title={title}>
      <div
        style={{
          position: "relative",
          width: 230,
          height: 230,
          margin: "20px auto 8px auto",
        }}
      >
        <div
          data-testid="donut-ring"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: ringBackground,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 26,
            borderRadius: "50%",
            background: "var(--bg-card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {centerLabel}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginTop: 3,
            }}
          >
            {centerSubLabel}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          No holdings yet
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 12,
          }}
        >
          {slices.map((slice) => (
            <div
              key={slice.label}
              data-testid="legend-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                data-testid="legend-swatch"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: slice.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {slice.label}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {pctFormatter.format(slice.pct)}%
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--text-tertiary)",
                  width: 70,
                  textAlign: "right",
                }}
              >
                {valueFormatter.format(slice.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
