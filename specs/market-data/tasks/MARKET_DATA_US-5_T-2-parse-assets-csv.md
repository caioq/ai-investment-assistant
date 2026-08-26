# MARKET_DATA_US-5_T-2: parseAssetsCsv, resolved by header name

**Story:** [../stories/US-5-asset-classification-import.md](../stories/US-5-asset-classification-import.md)
**Status:** Done
**GitHub Issue:** #167 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-5_T-1

Add `apps/api/src/market-data/assets-csv.ts` exporting `RawAssetRow` and `parseAssetsCsv(csvText: string): RawAssetRow[]`, modelled directly on `apps/api/src/recommended-portfolios/wallet-csv.ts` (`parseWalletCsv`) — same `csv-parse/sync` options mandated by `CONVENTIONS.md` → "CSV parsing" (`columns: false`, `relax_column_count: true`, `skip_empty_lines: true`), same header-name→index map instead of positional reads.

`RawAssetRow` has one `string | undefined` field per spec column: `ticker`, `sector`, `subSector`, `investmentStyle`, `riskRating`, `assetType`. Every value is the raw cell string; a column **absent from the header** yields `undefined` for every row, while a column **present but empty** yields `''`. Preserving that difference is the entire point of this function — the spec's absent-column-vs-empty-cell rule (`MARKET_DATA_US-5_T-4`) can't be implemented downstream if the parser flattens both to `undefined` or both to `''`.

Throw if the header has no `ticker` column: that means the file isn't an assets CSV, and should fail loudly rather than silently yield rows of `undefined`. Match header names case-sensitively against the spec's exact camelCase (`subSector`, not `subsector`) but `.trim()` each one, as `parseWalletCsv` does.

`parseWalletCsv`'s header→index map is four lines and is worth lifting into a small shared helper both files call if it comes out clean; if reconciling the two signatures costs more than those four lines, duplicate it and say so in a comment rather than contorting the wallet parser, which has its own `DY_`-prefix matching this file doesn't need.

**Test:** `apps/api/src/market-data/assets-csv.spec.ts` (colocated unit spec, per `CONVENTIONS.md` → "Testing") reading the fixtures from `MARKET_DATA_US-5_T-1`: (1) `assets-full.csv` parses into one `RawAssetRow` per data row with every field populated from the correct column — asserted by checking a row whose `sector` and `subSector` values differ, so a transposed mapping fails; (2) the empty-`ticker` row still appears in the output with `ticker: ''` (skipping it is the *service's* job in T-4, not the parser's — the parser reports, it doesn't filter); (3) `assets-partial.csv` yields rows where `sector` is a string and `investmentStyle`/`riskRating`/`assetType` are `undefined`; (4) `assets-empty-cells.csv` yields a row whose `riskRating` is `''`, **not** `undefined` — the assertion that pins the absent-vs-empty distinction; (5) a CSV whose header lacks `ticker` throws. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
