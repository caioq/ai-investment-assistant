# US-2: Bulk-import holdings from CSV

**Status:** Ready
**Traces to:** spec Goal "Add holdings manually or via CSV upload." / AC "CSV upload with 3 valid rows and 1 malformed row creates 3 holdings and reports 1 error, without a 500." (in `../spec.md`)

As someone with an existing portfolio, I want to upload a CSV of my positions instead of adding them one at a time, so getting started takes one step rather than twenty.

## Tasks

- [x] [T-1: CSV row parsing and per-row upsert](../tasks/PORTFOLIO_US-2_T-1-csv-row-parsing.md)
- [ ] [T-2: POST /portfolio/holdings/upload-csv](../tasks/PORTFOLIO_US-2_T-2-upload-csv-endpoint.md)

## Notes

**Partial success is the requirement, not a nicety.** The spec's AC is explicit that 3 valid rows and 1 malformed row produce 3 holdings *and* 1 reported error — not a rejected upload, and not a 500. That rules out the two easy implementations: validating the whole file up front and refusing it, or wrapping every row in one transaction that rolls back on the first bad line. Each row is processed independently and failures are collected into `errors[]`.

That's why the work splits at the parse/HTTP boundary. T-1 owns per-row parsing, validation, and the upsert — testable as a unit against an in-memory string, with no multipart machinery. T-2 is the thin multipart endpoint on top. Doing it the other way round would force every "what happens with a malformed row" case to be an e2e test with a file upload, which is slower and much harder to enumerate.

The upsert semantics deliberately reuse the same `(userId, assetId)` rule as `PORTFOLIO_US-1_T-1` — a ticker already held gets updated, not duplicated (spec Behavior Notes) — so importing the same file twice is idempotent rather than doubling every position.
