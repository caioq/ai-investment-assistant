"use client";

import { useRef, useState } from "react";
import { apiFetch } from "../../lib/api-client";
import { PerformanceChart } from "./PerformanceChart";
import type {
  PerformanceResponse,
  PortfolioValuePoint,
  PortfolioValuePointDto,
} from "../../lib/types";

export type PerformanceRangeValue = "6M" | "1Y" | "ALL";

const RANGES: PerformanceRangeValue[] = ["6M", "1Y", "ALL"];

/**
 * `PerformanceResponse`'s series arrives over HTTP with `date` as a JSON
 * string (`PortfolioValuePointDto`); `PerformanceChart` (and the shared
 * `PortfolioValuePoint` it's typed against) expects a real `Date` instance.
 */
function toValuePoints(
  points: PortfolioValuePointDto[] | undefined,
): PortfolioValuePoint[] | undefined {
  return points?.map((point) => ({
    date: new Date(point.date),
    value: point.value,
  }));
}

export interface PerformanceRangeProps {
  /**
   * The server-rendered `6M` response, handed in so the chart is on screen
   * in the first paint — this component fires no fetch on mount, only on a
   * range change (see `CONVENTIONS.md` → "Component conventions").
   */
  initialData: PerformanceResponse;
  /** Which benchmark (`IBOVESPA`/`CDI`) this instance's requests use. */
  benchmark: string;
}

/**
 * `'use client'` wrapper around the presentational `PerformanceChart`: holds
 * the selected 6M/1Y/ALL range and re-fetches `GET /portfolio/performance`
 * on change, without a full page reload.
 *
 * Guards against out-of-order responses (e.g. clicking `ALL` then quickly
 * `1Y` can let the slower `ALL` response resolve *after* the faster `1Y`
 * one) by tracking the currently-selected range in a ref and comparing it
 * against the range each in-flight request was made for at resolution time
 * — a resolution for a range that's no longer selected is dropped rather
 * than overwriting the chart with stale data.
 */
export function PerformanceRange({
  initialData,
  benchmark,
}: PerformanceRangeProps) {
  const [range, setRange] = useState<PerformanceRangeValue>("6M");
  const [data, setData] = useState<PerformanceResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [failedRange, setFailedRange] = useState<PerformanceRangeValue | null>(
    null,
  );
  const selectedRangeRef = useRef<PerformanceRangeValue>("6M");

  async function fetchRange(nextRange: PerformanceRangeValue) {
    setRange(nextRange);
    selectedRangeRef.current = nextRange;
    setIsLoading(true);
    setFailedRange(null);

    try {
      const response = await apiFetch<PerformanceResponse>(
        `/portfolio/performance?range=${nextRange}&benchmark=${benchmark}`,
      );

      // Drop a resolution for a range that's no longer the selected one.
      if (selectedRangeRef.current !== nextRange) {
        return;
      }
      setData(response);
    } catch {
      if (selectedRangeRef.current !== nextRange) {
        return;
      }
      setFailedRange(nextRange);
    } finally {
      if (selectedRangeRef.current === nextRange) {
        setIsLoading(false);
      }
    }
  }

  return (
    <div>
      {/*
        `aria-disabled` (not the native `disabled` attribute) while a fetch
        is in flight: it still communicates "busy" to assistive tech and
        dims the group visually, but deliberately keeps the buttons
        clickable so a user switching ranges again mid-fetch (e.g. ALL then
        quickly 1Y) starts the new request rather than being blocked — the
        stale-response guard above is what makes that safe.
      */}
      <div
        role="group"
        aria-label="Performance range"
        aria-disabled={isLoading}
        style={{ display: "flex", gap: 8, marginBottom: 12 }}
      >
        {RANGES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={range === option}
            onClick={() => fetchRange(option)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              border: "1px solid var(--border)",
              background:
                range === option ? "var(--blue)" : "var(--bg-card-alt)",
              color: range === option ? "#fff" : "var(--text-secondary)",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {option}
          </button>
        ))}
      </div>

      {failedRange ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--red)",
            marginBottom: 8,
          }}
        >
          <span>Couldn&apos;t load {failedRange} performance data.</span>
          <button
            type="button"
            onClick={() => fetchRange(failedRange)}
            style={{
              background: "none",
              border: "none",
              color: "var(--blue)",
              cursor: "pointer",
              fontWeight: 600,
              padding: 0,
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <PerformanceChart
        series={toValuePoints(data.series) ?? []}
        benchmarkSeries={toValuePoints(data.benchmarkSeries)}
        benchmarkLabel={benchmark}
      />
    </div>
  );
}
