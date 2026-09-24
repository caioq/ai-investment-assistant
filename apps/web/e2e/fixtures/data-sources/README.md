# `/data-sources` e2e fixtures

Every ticker is prefixed `E2EDS` (or `E2EZZ` for the deliberately unimported one) so the `Asset` rows the spec creates (assets are global) cannot collide with another suite's rows. `data-sources.spec.ts` deletes only tickers with these prefixes.

| File | Purpose |
| --- | --- |
| `assets-10-rows.csv` | 10 data rows. Row 4 (`E2EDS04`, `riskRating` = `ZZZ`) and row 9 (`E2EDS09`, `riskRating` = `NOPE`) are invalid because neither is on the `AAA`..`D` rating scale, so the review reads Rows 10 / Valid 8 / Errors 2 and the server rejects the same two. |
| `holdings-known.csv` | Positional `ticker,quantity,avgPrice`. Both tickers are in `assets-10-rows.csv`, so once that file is imported the preview has no unknown-ticker warnings. |
| `holdings-unknown.csv` | Same shape, but `E2EZZ99` is never imported, so it must warn "not in the asset master". |
| `not-a-csv.pdf` | Wrong-type file for the assets drop zone. Only its extension is checked. |
