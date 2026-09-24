# DATA_SOURCES_SHARED_T-11: Holdings validator and template match the server's current format

**Shared by:** US-3
**Status:** Done
**GitHub Issue:** #354 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-1, DATA_SOURCES_SHARED_T-2, DATA_SOURCES_SHARED_T-9

`validateHoldingsRows` currently claims to enforce "the rules the API's importer enforces" but doesn't: it resolves `Ticker`/`Quantidade`/`Preco Médio` **by name**, parses **Brazilian** numbers, and **silently skips** an empty ticker, whereas `PortfolioService.importHoldingsCsv` reads three cells **by position**, uses `Number()`, and reports an empty ticker as an error. Bring the shared side in line with the server (spec → "The holdings format is interim, on purpose"), and add the test that keeps them in line.

**1. `parseCsv` exposes raw rows.** Add `rawRows: string[][]` to `ParsedCsv` — every **data** row (header excluded), as the cells the file actually contained, trimmed, **before** padding or truncation to the header's width. Existing fields and callers are unchanged. This is required, not a nicety: a positional validator can't read cell 3 of a row whose header has only 2 columns from the header-keyed `rows`, because `parseCsv` drops it, yet the server accepts that row. Also make sure a fully blank line inside the file is skipped exactly as the server's `csv-parse` does (`skip_empty_lines: true`), because row numbers in messages depend on it — add a test for that, and align `parseCsv` if it differs.

**2. `HOLDINGS_COLUMNS` becomes `{ required: ['ticker', 'quantity', 'avgPrice'], optional: [] }`**, so `buildCsvTemplate('holdings')` emits `ticker,quantity,avgPrice`.

**3. `validateHoldingsRows` becomes positional**, reading `parsed.rawRows` and ignoring header text entirely. Its result's `columns` are the canonical `['ticker', 'quantity', 'avgPrice']` and each `rows` entry is keyed by those, so the preview table shows the same three headings whatever the file's header said. Every row stays in `rows` (as the other validators do); error rows are excluded from the write count by `rowIssues`. Per data row `N` (1-based, header excluded), with **messages identical to the server's**:

| Condition | Severity | Message |
|---|---|---|
| cell count ≠ 3 | error | `row N: expected 3 columns (ticker,quantity,avgPrice), got K` (stop checking that row) |
| empty ticker | error | `row N: ticker must not be empty` |
| `Number(quantity)` not finite or ≤ 0 | error | `row N: quantity must be a positive number` |
| `Number(avgPrice)` not finite or ≤ 0 | error | `row N: avgPrice must be a positive number` |
| ticker not in `knownTickers` | warning | the existing unknown-ticker warning (UI-only; the server has no such rule) |

Use `Number()` exactly as the server does — so `1234.56` and `1e3` are accepted, `1.234,56` and `""` are rejected. Faithfulness beats tidiness here. There is no missing-column file error: the server never checks the header.

**4. Parity test.** Add `apps/api/src/portfolio/holdings-parity.spec.ts`, following the mocking pattern the existing `PortfolioService` spec uses (mock Prisma and `upsertHolding`; only the parsing path is under test). Run one shared fixture set through **both** `importHoldingsCsv` and `validateHoldingsRows(parseCsv(csv), …)` and assert the failing rows and their messages are identical.

**Test:**
- `packages/shared/src/csv/parse-csv.test.ts` (extend): `rawRows` holds each data row's true cell count (a 4-cell row under a 3-column header reports 4; a 2-cell row reports 2); the header row is not in `rawRows`; an interior blank line is skipped and doesn't shift later row numbers.
- `packages/shared/src/csv/validators.test.ts` (holdings block **replaced**, not appended — the old by-name/Brazilian assertions describe the behaviour being removed): clean file → no issues; 4-cell row → the "got 4" error; 2-cell row → "got 2"; a header of `x,y` with 3-cell data rows is accepted; empty ticker → error; quantity `0`, `-1`, `abc` and `1.234,56` → the quantity error; price `-5` → the avgPrice error; `1e3` accepted; unknown ticker → warning only; the real 23-column export → an error on every row.
- `packages/shared/src/csv/build-csv-template.test.ts` (update): the holdings template is exactly `ticker,quantity,avgPrice`.
- `apps/api/src/portfolio/holdings-parity.spec.ts` (new): for the fixture set from the spec's parity acceptance criterion — a clean file, a 4-cell row, a 2-cell row, an empty ticker, a zero quantity, a negative price, a non-numeric quantity, a Brazilian-formatted number — the error messages from `importHoldingsCsv` and from the shared validator are equal, row for row.

**Done when:** the tests above exist and pass, following red-green TDD — write them first, run them and confirm they fail for the expected reason (not a typo/setup error), then implement until they pass. The whole `packages/shared` suite and the API unit suite pass, and no other caller of the old by-name holdings validator remains broken (`grep -rn "Quantidade\|Preco Médio" packages apps` should find only the spec-documented target format in comments).
