# US-5: Classify assets from an assets CSV

**Status:** Ready
**Traces to:** spec Goal "Maintain each asset's analytical classification — sector, sub-sector, investment style, risk rating — from a user-supplied **assets CSV**" / spec API Contract `POST /market-data/assets/import` / spec ACs "Importing an assets CSV containing a ticker with no `Holding` and no `RecommendedHolding` creates the `Asset` row and stores all four classification fields", "`BBAS3` imports as …", "`SMAL11` imports with `investmentStyle: ETF`", "Re-importing the same ticker with a changed `riskRating` overwrites the stored value…", "A row whose `riskRating` is unrecognised…", "Neither the price cron nor a recommended-portfolios wallet upload ever writes…" (in `../spec.md`)

As someone whose portfolio and recommended wallets are full of bare tickers, I want to upload one CSV that says what each ticker *is* — its sector, sub-sector, investment style and risk rating — so that allocation views and the AI Advisor can group by those dimensions instead of showing a single "Unclassified" slice.

## Tasks

- [ ] [T-1: assets CSV test fixtures](../tasks/MARKET_DATA_US-5_T-1-assets-csv-fixtures.md)
- [ ] [T-2: parseAssetsCsv, resolved by header name](../tasks/MARKET_DATA_US-5_T-2-parse-assets-csv.md)
- [ ] [T-3: normalizeAssetRow enum mapping](../tasks/MARKET_DATA_US-5_T-3-normalize-asset-row.md)
- [ ] [T-4: MarketDataService.importAssetsCsv](../tasks/MARKET_DATA_US-5_T-4-import-assets-csv-service.md)
- [ ] [T-5: POST /market-data/assets/import](../tasks/MARKET_DATA_US-5_T-5-assets-import-endpoint.md)

## Notes

**No schema task.** `MARKET_DATA_SHARED_T-1` (`Done`) already added `sector`, `subSector`, `investmentStyle`, `riskRating` and both enums to `Asset` — they have been in `apps/api/prisma/schema.prisma` since that task shipped, with nothing writing them. This story is the writer, not a migration. Note that `SHARED_T-1`'s own prose says *"this module never writes them (they're set from the holdings UI)"*; that sentence is superseded by the current spec and is flagged in that file, but its `Status` stays `Done` because the schema it produced is still exactly right.

**Why this is a whole story rather than a column on the holdings CSV.** Two earlier designs are recorded in the spec's Data Model note and should not be re-proposed. The short version: `RecommendedHolding` points at `Asset`, not `Holding`, so classification held per-user leaves every *unheld* recommendation unclassifiable — which is precisely the buy-candidate case the advisor's actual-vs-suggested comparison exists to answer.

**Partial success, not whole-file rejection.** `CONVENTIONS.md` → "CSV parsing" documents both patterns. This file is a bag of independent rows (like holdings), not a set that only means something whole (like a wallet snapshot), and the spec is explicit that a bad row is reported in `errors[]` while the rest still import. So it follows `importHoldingsCsv`, **not** `validateWalletRows`.

**The absent-column / empty-cell distinction is the subtlest rule here** and has its own AC. A column missing from the header leaves the stored value untouched; a column present with an empty cell clears that field to `null`. Getting this wrong means re-uploading a partial file silently wipes classification — which is why `parseAssetsCsv` must preserve `undefined` (absent) as distinguishable from `''` (empty), exactly as `parseWalletCsv` already does.

**No number parsing.** Unlike the holdings and wallet CSVs, every column here is a string or an enum member — there are no prices, weights or percentages. `parseBrazilianNumber` is not a dependency of this story.
