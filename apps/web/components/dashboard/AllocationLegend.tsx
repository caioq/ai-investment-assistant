"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import type { AllocationSlice } from "../../lib/types";

/** Rows shown before "View more" is needed — the only interactive bit of
 * `AllocationDonut`'s legend, which is why it's split into its own client
 * component rather than making the whole donut client-side. */
const LEGEND_COLLAPSED_COUNT = 5;

const valueFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const pctFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface AllocationLegendProps {
  slices: AllocationSlice[];
}

/**
 * `AllocationDonut`'s legend list, extracted as its own `"use client"`
 * component so the donut itself (`AllocationDonut.tsx`) can stay a Server
 * Component — only this list needs local state (the "View more"/"View
 * less" toggle), so only this list ships client JS.
 *
 * Caps the list at `LEGEND_COLLAPSED_COUNT` rows by default; a dataset with
 * more rows than that gets a toggle to show the rest and collapse back.
 */
export function AllocationLegend({ slices }: AllocationLegendProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMore = slices.length > LEGEND_COLLAPSED_COUNT;
  const visibleSlices = expanded ? slices : slices.slice(0, LEGEND_COLLAPSED_COUNT);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: 12,
      }}
    >
      {visibleSlices.map((slice) => (
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

      {hasMore ? (
        <Button
          variant="ghost"
          onClick={() => setExpanded((current) => !current)}
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "4px 0",
            alignSelf: "center",
          }}
        >
          {expanded ? "View less" : "View more"}
        </Button>
      ) : null}
    </div>
  );
}
