# Recommended Portfolios — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-ingest-wallet-export.md) | Upload a research house's wallet export | Done | T-1..T-6 in `../tasks/` |
| [US-2](./US-2-version-history.md) | Keep every version of every wallet | Done | T-1 in `../tasks/` |
| [US-3](./US-3-latest-per-wallet.md) | Read the current wallet per type | Ready | T-1 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`RECOMMENDED_PORTFOLIOS_SHARED_T-1-wallet-schema.md`](../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-1-wallet-schema.md) — `WalletType`/`Recommendation` enums, `RecommendedPortfolio` + `RecommendedHolding` models, and the back-relations they force onto `User`/`Asset`. Shared by US-1, US-2, US-3.
- [`RECOMMENDED_PORTFOLIOS_SHARED_T-2-module-guard.md`](../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-2-module-guard.md) — module/service/controller wiring under the `advisor/recommended-portfolios` route prefix, with the shared `AuthGuard`. Shared by US-1, US-2, US-3.
- [`RECOMMENDED_PORTFOLIOS_SHARED_T-3-csv-fixtures.md`](../tasks/RECOMMENDED_PORTFOLIOS_SHARED_T-3-csv-fixtures.md) — the three CSV fixtures every parser and upload test reads. Shared by US-1, US-2, US-3.

## Start here

All three `SHARED_` tasks are dependency-free and can be picked up in parallel, as can `RECOMMENDED_PORTFOLIOS_US-1_T-1` (Brazilian number parsing — a pure function) and `US-1_T-5` (the `findOrCreateAsset` refactor).

## Decisions this pass had to make

- **Test fixtures are synthetic, not the real exports — because this repository is public.** The spec's AC-1 says "uploading each of the three real exports", and the obvious reading is to commit those files. They contain a research house's proprietary recommendations: real tickers, ceiling prices, buy/sell calls and allocation weights from a paid subscription. Committing them here republishes that. `SHARED_T-3` instead commits fixtures that reproduce each export's **exact header, column order and formatting quirks** — `R$`/`%`/comma decimals, the tickerless fixed-income row, `DY_2026` vs `DY_2025`, Dividends' extra `CATEGORIA` and `PRECO_TETO_2` — with invented tickers and numbers. Every property the ACs check is preserved; only the proprietary values change. See that task for how to keep the fixtures honest.
- **`findOrCreateAsset` is extracted rather than reimplemented.** Spec Behavior Notes require an unseen `CODIGO` to create the `Asset`. `PortfolioService` already does exactly that, privately, including a P2002 race recovery added after concurrent requests for the same new ticker were found to 500. `US-1_T-5` moves it to `MarketDataService`, which owns the `Asset` model, rather than duplicating a subtlety that took a flaky test to find.
- **Parsing splits into value-level, header-level, and row-level tasks.** The spec fixes the design (one parser keyed on header names), but that still has three independent failure modes worth pinning separately: converting `"R$ 1.234,56"` to a number, resolving three different column layouts, and mapping a resolved row onto the model. Bundling them makes one task whose test has to set up a whole CSV to check a decimal separator.

## Out of scope for this pass

Everything the spec lists as a Non-Goal, restated here only where a task might otherwise drift into it:

- **Storing `RISCO`, `SETOR`, `CATEGORIA`** — risk rating and sector are `Asset` columns owned by [market-data](../../market-data/spec.md), arriving from a different source later. `RISCO`'s values (`AAA`/`A`/`B`/`C`) are valid `RiskRating` members, which makes writing them tempting; the spec's Non-Goals explain why a per-wallet opinion must not become authoritative shared master data. `US-1_T-3` asserts they are *not* written.
- **Storing `PRECO_ATUAL`/`VARIACAO`** (stale on arrival; market-data owns current price) and **`PRECO_TETO_2`** (disagrees with `PRECO_TETO` on two real rows).
- **Validating that a wallet's weights sum to 100** — stored exactly as published; a partially-allocated wallet is legitimate.
- **PDF/LLM extraction** and **editing rows after upload** — a correction is a new upload.
- **The Advisor's consumption of these snapshots** — this module ends at the JSON API.

## Notes on module boundaries

- The route prefix is **`advisor/recommended-portfolios`**, which deliberately does not match the module directory name. That's what the spec's API Contract specifies: the endpoints sit on the advisor surface the frontend talks to, while the code lives in its own module because it owns its own models. Recorded so nobody "fixes" the prefix to match the folder.
- `Asset` is owned by [market-data](../../market-data/spec.md). This module creates `Asset` rows for unseen tickers through market-data's service rather than writing that table directly, and never touches `Asset.riskRating`/`sector`.
