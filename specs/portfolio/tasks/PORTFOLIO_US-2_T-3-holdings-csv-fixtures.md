# PORTFOLIO_US-2_T-3: real-shape holdings CSV fixtures

**Story:** [../stories/US-2-csv-import.md](../stories/US-2-csv-import.md)
**Status:** Not Started
**GitHub Issue:** #173 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `apps/api/test/fixtures/portfolio/` with the holdings CSVs `PORTFOLIO_US-2_T-4`/`T-5` read, plus a `README.md` explaining why each looks the way it does — same purpose and structure as `apps/api/test/fixtures/recommended-portfolios/README.md`.

**Synthetic, not a copy of the real export.** This repository is public and the real sheet is the user's own position sizes and their research house's risk grades. No acceptance criterion depends on the *values*; every one depends on the file's **shape**. Reproduce the shape exactly and invent the data.

Tickers must be namespaced (`CSVA3`, `CSVB4`, `CSVC11`, …) per `CONVENTIONS.md` → "Testing" — and note that `portfolio.e2e-spec.ts` already claims `PETR4`, `VALE3`, `ITUB4`, `BBDC4`, `RACE3`, `BBAS3`, `WEGE3`, `MGLU3`, `ISOL4` and `SUMA1`–`SUMD4` across its describe blocks. Reusing any of those makes this suite's cleanup fight one of theirs.

Two fixtures:

- `holdings-real-shape.csv` — the 23-column layout: 17 named columns in the real order (`Ticker,Tipo,Setor,Classificacao,Grupo,DY,Risco,Quantidade,Preco,Preco Médio,Posicao,Posicao (%),*,Rent. (%),Rent. (R$),Preco Teto,Status`) followed by **6 unnamed trailing columns**. It must contain: a handful of holding rows with Brazilian-formatted `Quantidade`/`Preco Médio` (including one with a thousands separator); at least one row carrying a **second** `Preco Teto`/`Status` pair out in the unnamed columns; and a trailing block of **furniture rows with an empty `Ticker`** — blank separators plus at least one label/value row (the real file's `DY Medio`, `Posicao Total`, and a target-allocation block).
- `holdings-legacy-3col.csv` — the original `ticker,quantity,avgPrice` header with plain `Number()`-parseable values. This is the backwards-compatibility fixture; the spec keeps an AC for it because the old format must not stop working.

The `README.md` must state that the shape is the contract and must not be tidied — specifically that the unnamed trailing columns, the duplicate `Preco Teto` pair and the empty-`Ticker` rows are all deliberate, since each one is what some test exists to survive and all three look like mistakes to a future reader.

**Test:** `apps/api/test/fixtures/portfolio/fixtures.e2e-spec.ts` — a shape-guard spec that only reads files (named `*.e2e-spec.ts` because `test/jest-e2e.json` is the only config reaching that directory), mirroring `apps/api/test/fixtures/recommended-portfolios/fixtures.e2e-spec.ts`. Asserts: (1) both files exist and parse with `csv-parse/sync`; (2) `holdings-real-shape.csv`'s header row has 23 cells of which the last 6 are empty strings; (3) its header contains `Preco Médio` spelled with the accent and the space; (4) it has at least one data row whose `Ticker` cell is `''`; (5) at least one data value matches `/R\$ \d{1,3}\.\d{3},\d{2}/` (the thousands-separator case); (6) `holdings-legacy-3col.csv`'s header is exactly `['ticker','quantity','avgPrice']`. Confirm red first (the files don't exist), then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
