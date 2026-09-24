"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { DataSourcesSummary } from "../../lib/types";
import { formatSourceDate } from "./format-source-date";
import { createAssetsImportSource, ImportPanel } from "./ImportPanel";
import { ReportImportPanel } from "./ReportImportPanel";
import { SourceCard } from "./SourceCard";
import { WalletImportSection } from "./WalletImportSection";

export type DataSourceKey = "assets" | "holdings" | "wallets" | "report";

const NEVER_IMPORTED = "Never imported";
const WALLET_TYPE_COUNT = 3;

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

/**
 * Mounted only while the assets card is open, so `useRouter` is only needed
 * then. `router.refresh()` re-runs the page's `GET /data-sources/summary`, which
 * is what updates the card's meta line and — via `assets.tickers` — the known
 * tickers every other panel validates against.
 */
function RefreshingAssetsSection({ knownTickers }: { knownTickers: string[] }) {
  const router = useRouter();
  const source = useMemo(() => createAssetsImportSource(knownTickers), [knownTickers]);
  return <ImportPanel source={source} onImported={() => router.refresh()} />;
}

/** Mounted only while the wallets card is open, so `useRouter` is only needed then. */
function RefreshingWalletSection({
  wallets,
  knownTickers,
}: {
  wallets: DataSourcesSummary["wallets"];
  knownTickers: string[];
}) {
  const router = useRouter();
  return (
    <WalletImportSection
      wallets={wallets}
      knownTickers={knownTickers}
      onImported={() => router.refresh()}
    />
  );
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

/** Refreshes the server-fetched summary after an import (the router hook is confined here, off the page's default path). */
function ReportPanelWithRefresh({
  currentReport,
}: {
  currentReport: DataSourcesSummary["report"];
}) {
  const router = useRouter();
  return (
    <ReportImportPanel
      currentReport={currentReport}
      onImported={() => router.refresh()}
    />
  );
}

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
 * The selected card reveals its import panel below the grid. Sources whose
 * panel hasn't been built yet (holdings, and the report until its task lands)
 * reveal an empty region rather than a stubbed panel, so nothing promises an
 * import path that doesn't exist. `summary.assets.tickers` is the known-ticker
 * list every panel validates against.
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

      <section aria-label={`${selectedSource.name} import`}>
        {selected === "assets" ? (
          <RefreshingAssetsSection knownTickers={summary.assets.tickers} />
        ) : null}
        {selected === "wallets" ? (
          <RefreshingWalletSection
            wallets={summary.wallets}
            knownTickers={summary.assets.tickers}
          />
        ) : null}
        {selected === "report" ? (
          <ReportPanelWithRefresh currentReport={summary.report} />
        ) : null}
      </section>
    </div>
  );
}
