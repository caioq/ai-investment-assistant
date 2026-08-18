# RECOMMENDED_PORTFOLIOS_US-1_T-2: CSV parsing and whole-file validation

**Story:** [../stories/US-1-upload-wallet-csv.md](../stories/US-1-upload-wallet-csv.md)
**Status:** Not Started
**GitHub Issue:** #134 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-2

Add a parse-and-validate step to `RecommendedPortfoliosService` turning a `ticker,targetWeightPct,limitPrice` CSV string (header row included) into validated rows, or into a rejection listing every problem found.

Parse with `csv-parse/sync` per `CONVENTIONS.md` → "CSV parsing" — `columns: false`, `relax_column_count: true`, `skip_empty_lines: true`, never `split(',')`, since a Brazilian decimal comma or an extra field silently shifts every column.

**Validation is whole-file, not per-row.** Spec AC-4 requires rows outside 0–100 to be "rejected with a clear error, not silently stored"; this task rejects the **entire upload** with a `BadRequestException` whose message names every offending row, rather than importing the good rows and reporting the rest. This is a deliberate divergence from `PortfolioService.importHoldingsCsv`, which accepts partial success — a holdings CSV is a bag of independent positions, whereas a model portfolio is a set of weights that only means something whole. Storing 8 of 10 rows yields a snapshot that misrepresents what the research house published, and [advisor](../../advisor/spec.md) would reason over it as complete with nothing signalling the gap. See `../stories/README.md` → "Decisions this pass had to make".

Reject a row for: wrong column count, empty `ticker`, non-numeric `targetWeightPct`/`limitPrice`, `targetWeightPct` outside `0–100` inclusive, or a non-positive `limitPrice`. Report every failure in one response — validating up front and failing on the first bad row means a user with three mistakes fixes them one upload at a time. Uppercase tickers here too, matching `findOrCreateAsset`'s normalisation, so a wallet CSV and a holdings CSV can't disagree about what `petr4` means.

**Test:** `apps/api/src/recommended-portfolios/recommended-portfolios.service.spec.ts` — a unit test with a mocked `PrismaService` (per `CONVENTIONS.md` → "Testing"), against in-memory CSV strings with no multipart involved:

1. A well-formed 3-row CSV parses to 3 rows with numeric `targetWeightPct`/`limitPrice` and uppercased tickers.
2. **Spec AC-4** — a CSV whose 2nd row has `targetWeightPct: 150` rejects, and **nothing is written**: assert no `recommendedPortfolio.create` was issued on the mocked Prisma. A `-5` weight rejects the same way (the "0–100" bound is two-sided; `>100` alone is the easy half to remember).
3. A CSV with **two** bad rows produces one error naming **both** row numbers, not just the first.
4. A blank trailing newline produces no error.
5. Lowercase tickers come back uppercased.

Confirm red first (no parse method exists), then green.

**Done when:** the tests above pass — case 2's "nothing was written" assertion in particular, since an implementation that validates *while* inserting returns the right error having already persisted a partial wallet.
