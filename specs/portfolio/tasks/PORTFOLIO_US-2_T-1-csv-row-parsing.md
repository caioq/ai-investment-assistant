# PORTFOLIO_US-2_T-1: CSV row parsing and per-row upsert

**Story:** [../stories/US-2-csv-import.md](../stories/US-2-csv-import.md)
**Status:** Not Started
**GitHub Issue:** #104 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-1_T-1

Add `PortfolioService.importHoldingsCsv(userId, csv: string)` returning `{ created: number, updated: number, errors: string[] }` — the response body of `POST /portfolio/holdings/upload-csv` (`PORTFOLIO_US-2_T-2` is the thin multipart wrapper over this).

Parse a `ticker,quantity,avgPrice` CSV with a header row and process **each row independently**, reusing the same find-or-create-`Asset` + upsert-on-`(userId, assetId)` logic as `PORTFOLIO_US-1_T-1` (extract it to a shared private method rather than duplicating it — the ticker-uppercasing rule in particular must not diverge between the two entry points, or the same file imported two ways produces different `Asset` rows). Count an upsert that inserted toward `created` and one that updated an existing holding toward `updated`.

**A malformed row must not stop the batch, and must not roll back the good rows.** Spec AC-3 requires 3 valid + 1 malformed to yield 3 holdings *and* 1 error, without a 500 — which rules out both validating the file up front and refusing it, and wrapping all rows in one transaction. Collect each failure into `errors[]` with the row number and reason (`"row 3: quantity must be a positive number"`) so the user can fix the file, and continue.

Treat as malformed: wrong column count, a non-numeric or non-positive `quantity`/`avgPrice`, and an empty `ticker`. Skip a blank trailing line silently rather than reporting it as an error — text editors add one and it isn't a user mistake.

Use a real CSV parser rather than `split(',')`: a `name` field or a Brazilian decimal comma will otherwise silently shift every column. Add `csv-parse` (or `papaparse`) as an `apps/api` dependency — neither is currently installed.

**Test:** `apps/api/src/portfolio/portfolio.service.spec.ts` — a unit test with a mocked `PrismaService`, per `CONVENTIONS.md` → "Testing", exercising the parse/validate logic against in-memory strings with no multipart involved:

1. **Spec AC-3 exactly** — a 4-row CSV with 3 valid rows and 1 malformed (`PETR4,abc,30`) resolves to `created: 3` and `errors.length === 1`, and does **not** throw. Assert the three valid upserts were still issued, so a rollback-on-error implementation fails here.
2. The error string names the offending row number and reason.
3. A file whose tickers are already held reports them as `updated`, not `created`, and issues no duplicate inserts — re-importing the same file twice is idempotent.
4. A CSV with a blank trailing newline reports **no** error.
5. Lowercase tickers in the file resolve to the same `Asset` as uppercase — the same normalisation as `PORTFOLIO_US-1_T-1`.

Confirm red first (no `importHoldingsCsv` method), then green.

**Done when:** the test above passes — case 1's "the valid rows were still written" assertion in particular, since a single-transaction implementation returns the right counts while having persisted nothing.
