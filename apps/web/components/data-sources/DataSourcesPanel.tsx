"use client";

import { useState } from "react";

import type { DataSourcesSummary } from "../../lib/types";
import { SourceCard } from "./SourceCard";

export type DataSourceKey = "assets" | "holdings" | "wallets" | "report";

const NEVER_IMPORTED = "Never imported";
const WALLET_TYPE_COUNT = 3;

/**
 * "Sep 12, 2026" — the card meta lines' date format (the design prototype's
 * `fmtDate`). Formatted in **UTC**, not the viewer's zone: `lastImportAt` is
 * a timestamp but `effectiveDate`/`publishedAt` are dates serialized as UTC
 * midnight, which a negative-offset local zone would render a day early.
 */
function formatSourceDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function assetsMeta(summary: DataSourcesSummary): string {
  const { count, lastImportAt } = summary.assets;
  return lastImportAt
    ? `${formatSourceDate(lastImportAt)} · ${count} assets`
    : NEVER_IMPORTED;
}

function holdingsMeta(summary: DataSourcesSummary): string {
  const { count, lastImportAt } = summary.holdings;
  return lastImportAt
    ? `${formatSourceDate(lastImportAt)} · ${count} positions`
    : NEVER_IMPORTED;
}

function walletsMeta(summary: DataSourcesSummary): string {
  const imported = summary.wallets.length;
  return imported === 0
    ? NEVER_IMPORTED
    : `${imported} of ${WALLET_TYPE_COUNT} wallets imported`;
}

function reportMeta(summary: DataSourcesSummary): string {
  const report = summary.report;
  if (!report) {
    return NEVER_IMPORTED;
  }

  // `title` is nullable (it was added after the first reports were uploaded),
  // so fall back to the file name before an anonymous label; likewise
  // `publishedAt` falls back to when it was uploaded.
  const label = report.title ?? report.fileName ?? "Untitled report";
  return `${label} · ${formatSourceDate(report.publishedAt ?? report.uploadedAt)}`;
}

interface SourceDefinition {
  key: DataSourceKey;
  step: number;
  name: string;
  format: "CSV" | "PDF";
  description: string;
  meta: (summary: DataSourcesSummary) => string;
}

const SOURCES: SourceDefinition[] = [
  {
    key: "assets",
    step: 1,
    name: "Assets",
    format: "CSV",
    description:
      "Master list of tickers with sector, investment style and risk rating.",
    meta: assetsMeta,
  },
  {
    key: "holdings",
    step: 2,
    name: "Holdings",
    format: "CSV",
    description: "Your positions: ticker, quantity and average price paid.",
    meta: holdingsMeta,
  },
  {
    key: "wallets",
    step: 3,
    name: "Model wallets",
    format: "CSV",
    description:
      "Target portfolios: Dividends, Overall Recommendation, Small Caps.",
    meta: walletsMeta,
  },
  {
    key: "report",
    step: 4,
    name: "Research report",
    format: "PDF",
    description: "The PDF the AI Advisor cites when reviewing your portfolio.",
    meta: reportMeta,
  },
];

/**
 * The `'use client'` boundary of `/data-sources`: it owns nothing but which
 * source is selected, so the page above it stays a Server Component that
 * fetches `GET /data-sources/summary` (see `CONVENTIONS.md` → "Component
 * conventions": `'use client'` goes on the smallest subtree that actually
 * needs state).
 *
 * The page opens on **Assets** — the first step, and the file every other
 * source is matched against by ticker.
 *
 * The import panels themselves arrive with US-2 onwards; until then the
 * selected card reveals an empty placeholder region rather than a stubbed
 * panel, so nothing promises an import path that doesn't exist yet.
 */
export function DataSourcesPanel({ summary }: { summary: DataSourcesSummary }) {
  const [selected, setSelected] = useState<DataSourceKey>("assets");
  const selectedSource =
    SOURCES.find((source) => source.key === selected) ?? SOURCES[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {SOURCES.map((source) => (
          <SourceCard
            key={source.key}
            step={source.step}
            name={source.name}
            format={source.format}
            description={source.description}
            meta={source.meta(summary)}
            selected={source.key === selected}
            onSelect={() => setSelected(source.key)}
          />
        ))}
      </div>

      <section aria-label={`${selectedSource.name} import`} />
    </div>
  );
}
