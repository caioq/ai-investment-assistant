import type { DataSourcesSummary, WalletType } from "../../lib/types";
import { formatSourceDate } from "./format-source-date";

/** The three wallet types, in the order the panel lists them. */
export const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: "DIVIDENDS", label: "Dividends" },
  { value: "OVERALL_RECOMMENDED", label: "Overall Recommendation" },
  { value: "SMALL_CAPS", label: "Small Caps" },
];

export const NO_WALLET_VERSION_NOTE =
  "No version imported yet. The AI Advisor cannot reference this wallet until one is.";

export interface WalletTypeSelectorProps {
  /** `GET /data-sources/summary`'s `wallets` — one entry per *imported* type. */
  wallets: DataSourcesSummary["wallets"];
  value: WalletType;
  onChange: (walletType: WalletType) => void;
}

/**
 * The model-wallets panel's segmented control plus its version note
 * (`specs/data-sources/spec.md` → Presentation / Accessibility).
 *
 * Each option carries a 6px status dot — `--emerald` when that type has a
 * version in the summary, `--red` when it doesn't — but the dot is never the
 * only carrier of that status: it has an `aria-label` of "Imported" /
 * "Not imported" so it is spoken as well as seen. The active option is a
 * pressed `<button type="button">` (`aria-pressed`), the same "selecting
 * reveals a panel, not navigation" reading as `SourceCard`.
 *
 * Presentational only, with no `'use client'` of its own: the selected type
 * lives in the client component above it (`useWalletImportState`).
 */
export function WalletTypeSelector({
  wallets,
  value,
  onChange,
}: WalletTypeSelectorProps) {
  const current = wallets.find((wallet) => wallet.walletType === value);
  const note = current
    ? `Current version: ${formatSourceDate(current.effectiveDate)} · ${current.positions} positions`
    : NO_WALLET_VERSION_NOTE;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 12,
          background: "var(--bg-card-alt)",
          border: "1px solid var(--border)",
          width: "fit-content",
        }}
      >
        {WALLET_TYPES.map((walletType) => {
          const selected = walletType.value === value;
          const imported = wallets.some(
            (wallet) => wallet.walletType === walletType.value,
          );

          return (
            <button
              key={walletType.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(walletType.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                font: "inherit",
                fontSize: 12.5,
                fontWeight: selected ? 700 : 600,
                cursor: "pointer",
                padding: "7px 12px",
                borderRadius: 9,
                border: "1px solid transparent",
                color: selected ? "var(--text-primary)" : "var(--text-secondary)",
                background: selected ? "var(--bg-card)" : "transparent",
                boxShadow: selected ? "var(--shadow)" : "none",
              }}
            >
              <span
                aria-label={imported ? "Imported" : "Not imported"}
                role="img"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: imported ? "var(--emerald)" : "var(--red)",
                }}
              />
              {walletType.label}
            </button>
          );
        })}
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-tertiary)" }}>
        {note}
      </p>
    </div>
  );
}
