# MARKET_DATA_US-5_T-1: assets CSV test fixtures

**Story:** [../stories/US-5-asset-classification-import.md](../stories/US-5-asset-classification-import.md)
**Status:** Done
**GitHub Issue:** #166 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `apps/api/test/fixtures/market-data/` with the assets CSVs every task in this story reads, plus a `README.md` recording why each one looks the way it does — same purpose and structure as `apps/api/test/fixtures/recommended-portfolios/README.md` (`RECOMMENDED_PORTFOLIOS_SHARED_T-3`).

Tickers must be **namespaced to this suite** (`MDAS1`–`MDAS9`, not `PETR4`/`BBAS3`), per `CONVENTIONS.md` → "Testing": e2e suites run in parallel against one Postgres, and reusing a real-looking ticker another suite reaches for makes the two delete each other's rows. This module's existing `market-data.e2e-spec.ts` already uses `MDTA4` for the same reason — do not reuse that exact value either, since this story's cleanup would then race that suite's.

Four fixtures, each existing for a specific assertion:

- `assets-full.csv` — all six columns (`ticker,sector,subSector,investmentStyle,riskRating,assetType`), a handful of rows covering more than one `investmentStyle` and `riskRating`, at least one row with `investmentStyle: ETF`, and **one row with an empty `ticker`** (the furniture row that must be skipped silently, not reported).
- `assets-partial.csv` — `ticker` plus **only** `sector`. Proves an absent column leaves the other three fields untouched on re-import.
- `assets-empty-cells.csv` — the same tickers as `assets-full.csv` with `riskRating` present in the header but **empty** for one row. Proves an empty cell clears that one field. `assets-partial.csv` and this file are the pair that make the absent-vs-empty rule testable at all; neither is redundant.
- `assets-bad-values.csv` — one row with an unrecognised `riskRating` (`Z`), one with a still-Portuguese `investmentStyle` (`DIVIDENDOS`), and at least two valid rows around them, so a test can assert the good rows import while the bad ones land in `errors[]`.

The `README.md` must state that the shape is the contract and must not be "corrected" — in particular that the empty-`ticker` row and the Portuguese `DIVIDENDOS` value are deliberate, since both look like mistakes to a future reader tidying the files up.

**Test:** `apps/api/test/fixtures/market-data/fixtures.e2e-spec.ts` — a shape-guard spec that only reads files (named `*.e2e-spec.ts` because `test/jest-e2e.json` is the only config reaching that directory, per `CONVENTIONS.md` → "Testing"), mirroring `apps/api/test/fixtures/recommended-portfolios/fixtures.e2e-spec.ts`. It asserts: (1) all four files exist and parse with `csv-parse/sync`; (2) `assets-full.csv`'s header is exactly the six column names in the spec's order; (3) `assets-full.csv` contains at least one data row whose `ticker` cell is empty; (4) `assets-partial.csv`'s header contains `ticker` and `sector` and **not** `investmentStyle`/`riskRating`/`assetType`; (5) `assets-empty-cells.csv` has `riskRating` in its header with at least one row whose value for it is `''`; (6) `assets-bad-values.csv` contains both `Z` as a `riskRating` and `DIVIDENDOS` as an `investmentStyle`. Confirm red first (the files don't exist), then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
