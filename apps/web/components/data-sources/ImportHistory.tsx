"use client";

import { useState } from "react";

import type { ImportLogEntry, ImportSource, WalletType } from "../../lib/types";

const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const SOURCE_LABELS: Record<ImportSource, string> = {
  ASSETS: "Assets",
  HOLDINGS: "Holdings",
  WALLET: "Model wallets",
  REPORT: "Research report",
};

const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  DIVIDENDS: "Dividends",
  OVERALL_RECOMMENDED: "Overall Recommendation",
  SMALL_CAPS: "Small Caps",
};

/**
 * "Sep 12, 2026" in **UTC**, matching the source cards' meta lines
 * (`DataSourcesPanel.formatSourceDate`) so two dates on the same page can't
 * disagree by a day in a negative-offset zone.
 */
function formatImportDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function sourceLabel(log: ImportLogEntry): string {
  const label = SOURCE_LABELS[log.source];
  return log.source === "WALLET" && log.walletType
    ? `${label} · ${WALLET_TYPE_LABELS[log.walletType]}`
    : label;
}

const CELL_PADDING = "10px 12px";

const headerCellStyle = {
  padding: CELL_PADDING,
  textAlign: "left",
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
} as const;

const bodyCellStyle = {
  padding: CELL_PADDING,
  fontSize: 13,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
} as const;

/** "Imported" / "Failed" — always the word, with colour only reinforcing it. */
function StatusCell({ status }: { status: ImportLogEntry["status"] }) {
  const imported = status === "IMPORTED";

  return (
    <span
      style={{
        fontSize: 12.5,
        fontWeight: 600,
        color: imported ? "var(--emerald)" : "var(--red)",
      }}
    >
      {imported ? "Imported" : "Failed"}
    </span>
  );
}

function ImportRow({ log }: { log: ImportLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const rejected = log.errors ?? [];
  const hasRejected = rejected.length > 0;
  const detailsId = `import-${log.id}-rejected`;

  return (
    <>
      <tr>
        <td style={bodyCellStyle}>{formatImportDate(log.createdAt)}</td>
        <td style={bodyCellStyle}>{sourceLabel(log)}</td>
        <td style={{ ...bodyCellStyle, fontFamily: MONO_STACK, fontSize: 12.5 }}>
          {log.fileName}
        </td>
        <td style={{ ...bodyCellStyle, textAlign: "right", whiteSpace: "nowrap" }}>
          {hasRejected ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={`${expanded ? "Hide" : "Show"} ${rejected.length} rejected rows from ${log.fileName}`}
              onClick={() => setExpanded((open) => !open)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
                color: "var(--text-primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{`${log.records} · ${rejected.length} rejected`}</span>
              <span aria-hidden="true" style={{ color: "var(--text-tertiary)" }}>
                {expanded ? "▾" : "▸"}
              </span>
            </button>
          ) : (
            log.records
          )}
        </td>
        <td style={bodyCellStyle}>
          <StatusCell status={log.status} />
          {log.message ? (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              {log.message}
            </div>
          ) : null}
        </td>
      </tr>
      {hasRejected && expanded ? (
        <tr id={detailsId}>
          <td colSpan={5} style={{ ...bodyCellStyle, background: "var(--bg-card-alt)" }}>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              {rejected.map((message, index) => (
                <li
                  key={`${log.id}-rejected-${index}`}
                  style={{ fontSize: 12.5, color: "var(--text-secondary)" }}
                >
                  {message}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/**
 * The import history card on `/data-sources` (`DATA_SOURCES_US-6_T-1`,
 * spec.md → Flow): **one row per import attempt, never one per rejected
 * row**. A partial success is a single `IMPORTED` row reading
 * "28 · 12 rejected", expandable to list every rejected row, so the detail
 * outlives the success banner.
 *
 * Purely a reader: writing the log is each import panel's job (it POSTs
 * `/data-sources/imports` once its upload resolves) and `logs` is handed in
 * already sorted newest-first by `GET /data-sources/imports?limit=20` — this
 * component neither fetches nor re-sorts.
 */
export function ImportHistory({ logs }: { logs: ImportLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Nothing has been imported yet. Imports will be listed here with what was
        written and anything the server rejected.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th scope="col" style={headerCellStyle}>
              Date
            </th>
            <th scope="col" style={headerCellStyle}>
              Source
            </th>
            <th scope="col" style={headerCellStyle}>
              File
            </th>
            <th scope="col" style={{ ...headerCellStyle, textAlign: "right" }}>
              Records
            </th>
            <th scope="col" style={headerCellStyle}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <ImportRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
