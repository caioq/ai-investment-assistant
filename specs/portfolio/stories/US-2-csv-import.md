# US-2: Bulk-import holdings from CSV

**Status:** In Progress
**Traces to:** spec Goal "Add holdings manually or via CSV upload." / ACs "CSV upload with 3 valid rows and 1 malformed row creates 3 holdings and reports 1 error, without a 500.", "The real export (`Carteira - RendaVariavel.csv`, 23 columns) imports **31 holdings** and reports **zero** errors", "A CSV with only `ticker,quantity,avgPrice` … still imports successfully", "A value with a thousands separator … parses as `589394.17`", "Uploading the real export writes **nothing** to `Asset.sector` …", "The columns the sheet computes … are not persisted anywhere" (in `../spec.md`)

As someone with an existing portfolio, I want to upload a CSV of my positions instead of adding them one at a time, so getting started takes one step rather than twenty.

## Tasks

- [x] [T-1: CSV row parsing and per-row upsert](../tasks/PORTFOLIO_US-2_T-1-csv-row-parsing.md)
- [x] [T-2: POST /portfolio/holdings/upload-csv](../tasks/PORTFOLIO_US-2_T-2-upload-csv-endpoint.md)
- [ ] [T-3: real-shape holdings CSV fixtures](../tasks/PORTFOLIO_US-2_T-3-holdings-csv-fixtures.md)
- [ ] [T-4: parseHoldingsCsv, resolved by header name](../tasks/PORTFOLIO_US-2_T-4-parse-holdings-csv.md)
- [ ] [T-5: import the real export end to end](../tasks/PORTFOLIO_US-2_T-5-import-real-export.md)

Plus [`PORTFOLIO_SHARED_T-4`](../tasks/PORTFOLIO_SHARED_T-4-brazilian-number-to-shared.md), which T-5 needs.

## Notes

**Partial success is the requirement, not a nicety.** The spec's AC is explicit that 3 valid rows and 1 malformed row produce 3 holdings *and* 1 reported error — not a rejected upload, and not a 500. That rules out the two easy implementations: validating the whole file up front and refusing it, or wrapping every row in one transaction that rolls back on the first bad line. Each row is processed independently and failures are collected into `errors[]`.

That's why the work splits at the parse/HTTP boundary. T-1 owns per-row parsing, validation, and the upsert — testable as a unit against an in-memory string, with no multipart machinery. T-2 is the thin multipart endpoint on top. Doing it the other way round would force every "what happens with a malformed row" case to be an e2e test with a file upload, which is slower and much harder to enumerate.

**Reopened: the shipped importer cannot read the user's actual file.** T-1 and T-2 were built against a `ticker,quantity,avgPrice` CSV, which is what the spec described at the time. The spec has since been rewritten against the real 23-column spreadsheet export, and the shipped parser reads columns *positionally* and rejects any row that isn't exactly 3 wide — so a valid file produces **0 holdings and 41 errors**, one per row. T-3..T-5 close that; `SHARED_T-4` unblocks T-5.

T-1 keeps `Status: Done` rather than being reopened. What it actually built — the per-row `errors[]` loop, the `(userId, assetId)` upsert, the partial-success contract — is still correct and still tested; only its column-reading half is superseded, which is flagged in that file. T-2 is untouched: it's a thin multipart wrapper and doesn't care what the file looks like.

The upsert semantics deliberately reuse the same `(userId, assetId)` rule as `PORTFOLIO_US-1_T-1` — a ticker already held gets updated, not duplicated (spec Behavior Notes) — so importing the same file twice is idempotent rather than doubling every position.
