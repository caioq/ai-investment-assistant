# US-1: Upload a research house's wallet export

**Status:** Ready
**Traces to:** spec Goal "Ingest a research-house CSV per wallet type. Three exist today — Overall Recommended, Dividends, Small Caps — and adding a fourth must not require new parsing code." / Goal "Normalise the published columns into a common shape…" / ACs 1–9 (in `../spec.md`)

As someone following a research house, I want to upload their wallet export exactly as they publish it, so the AI Advisor gets structured recommendations without me reformatting a spreadsheet first.

## Tasks

- [x] [T-1: Brazilian number parsing](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-1-brazilian-number-parsing.md)
- [x] [T-2: header-driven column resolution](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-2-header-column-mapping.md)
- [x] [T-3: row normalisation](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-3-row-normalisation.md)
- [x] [T-4: whole-file validation](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-4-whole-file-validation.md)
- [x] [T-5: extract findOrCreateAsset to MarketDataService](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-5-find-or-create-asset.md)
- [ ] [T-6: POST /advisor/recommended-portfolios/upload](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-6-upload-endpoint.md)

## Notes

**This story exists because the exports are not a clean CSV.** They're the research house's own format, and each of T-1 through T-3 pins a different way a naive implementation silently fails on them:

- `Number("8,00%")` is `NaN`, so a normal numeric parse rejects **every row of every file** (T-1).
- The three files carry different columns *in different orders* — `EMPRESA` is first in two of them and second in Dividends — so anything positional reads the wrong field rather than erroring (T-2).
- The dividend-yield column has the projection year in its name (`DY_2026`, `DY_2025`), so an exact-name match silently drops the field the year it rolls over (T-2).
- One row in the Overall wallet has no ticker at all (T-3).

Splitting them keeps each test able to state its case in one line instead of assembling a whole CSV to check a decimal separator.

**T-4 rejects the whole file, deliberately unlike `portfolio`'s holdings CSV**, which accepts partial success. Per the spec's Behavior Notes: a wallet is a set that only means something whole, so importing 8 of 10 rows produces a snapshot misrepresenting what was published, which the Advisor then reads as complete. A reviewer coming from `PortfolioService.importHoldingsCsv` will expect the opposite — that's why it's spelled out.

**The tickerless row is a feature, not an edge case.** Overall's `Renda Fixa - LFT Tesouro` line carries a real 15% allocation with no `CODIGO`, and the wallet's equity rows sum to **85** — so dropping it both loses a real allocation and makes the wallet look fully invested in equities. It lands with `assetId: null` and its `label` (T-3).

**T-5 is a refactor, not new logic** — see `README.md` → "Decisions this pass had to make". It must leave `portfolio`'s existing unit and e2e suites passing unchanged, which is what proves behaviour was preserved rather than relocated.
