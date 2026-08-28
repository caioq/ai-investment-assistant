# PORTFOLIO_US-2_T-5: import the real export end to end

**Story:** [../stories/US-2-csv-import.md](../stories/US-2-csv-import.md)
**Status:** Not Started
**GitHub Issue:** #175 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-2_T-4, PORTFOLIO_SHARED_T-4

Rewire `PortfolioService.importHoldingsCsv` (`apps/api/src/portfolio/portfolio.service.ts`) onto `parseHoldingsCsv` (`T-4`) and `parseBrazilianNumber` (`SHARED_T-4`), replacing the positional 3-column reader. The per-row `errors[]` partial-success loop and the `(userId, assetId)` upsert stay exactly as they are — `PORTFOLIO_US-2_T-1` got those right and they are not in scope here.

Four behavior changes, each with its own AC in the spec:

- **A row with an empty `Ticker` is skipped silently** — not counted in `created`/`updated`, and **not** added to `errors[]`. The export ends in ~10 furniture rows (blank separators, `DY Medio`, `Posicao Total`, a target-allocation block). They aren't malformed holdings, they aren't holdings at all, and reporting them would show ten failures on a perfectly good file. This is the single most important line in this task: the current code's `ticker must not be empty` error is exactly the wrong behavior for this file.
- **`quantity` and `avgPrice` go through `parseBrazilianNumber`**, never `Number()` — `Number("R$ 23,68")` is `NaN`, and a thousands separator (`"R$ 589.394,17"`) must land as `589394.17`, not `589.39`. A `NaN` from the parser is a row error; a `null` (absent value) is a row error too, since both fields are required.
- **No column-count check.** Drop `if (row.length !== 3)` entirely — width is no longer meaningful once columns resolve by name.
- **Nothing is written to `Asset.sector`/`subSector`/`investmentStyle`/`riskRating`** even though the file carries all five classification columns. They belong to [market-data](../../market-data/spec.md)'s assets CSV.

**Test:** extend `apps/api/test/portfolio.e2e-spec.ts` with a new describe block for the real-shape import, using this suite's own `CSVA3`/`CSVB4`/… fixture tickers and its own scoped `afterEach` (`CONVENTIONS.md` → "Testing" — the file's existing blocks already claim `PETR4`/`BBAS3`/etc., so don't reuse those). Asserts: (1) uploading `holdings-real-shape.csv` creates one `Holding` per real row and returns `errors: []` — the headline case, currently 0 imported and 41 errors; (2) the furniture rows produced neither a `Holding` nor an `errors[]` entry; (3) the row with a thousands-separated value stored `589394.17`-scale precision, not a truncated `589.39`; (4) `avgPrice` matches the `Preco Médio` column and not the adjacent `Preco` column, for a row where the two differ; (5) after the import, every touched `Asset` still has `sector`, `subSector`, `investmentStyle` and `riskRating` `null`; (6) `holdings-legacy-3col.csv` still imports successfully, proving the old format didn't regress; (7) the existing "3 valid rows + 1 malformed row → 3 created, 1 error" case still passes unchanged. Confirm red first — (1) will fail with the current column-count rejection, which is the exact bug this task closes.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
