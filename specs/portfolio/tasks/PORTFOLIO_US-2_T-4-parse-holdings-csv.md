# PORTFOLIO_US-2_T-4: parseHoldingsCsv, resolved by header name

**Story:** [../stories/US-2-csv-import.md](../stories/US-2-csv-import.md)
**Status:** Not Started
**GitHub Issue:** #174 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-2_T-3

Add `apps/api/src/portfolio/holdings-csv.ts` exporting `RawHoldingRow` and `parseHoldingsCsv(csvText: string): RawHoldingRow[]`, modelled on `apps/api/src/recommended-portfolios/wallet-csv.ts` (`parseWalletCsv`): the `csv-parse/sync` options `CONVENTIONS.md` → "CSV parsing" mandates, and a header-name→index map instead of positional reads.

This exists because the shipped parser reads columns positionally (`const [rawTicker, rawQuantity, rawAvgPrice] = row`) and rejects anything that isn't exactly 3 wide (`if (row.length !== 3)`). The real export is 23 columns, so **every row of a valid file currently fails** — 41 errors, 0 imported. See `PORTFOLIO_US-2_T-1`, which this supersedes in part.

`RawHoldingRow` carries `ticker`, `quantity`, `avgPrice` as `string | undefined`, read from the `Ticker`, `Quantidade` and `Preco Médio` columns. Note `Preco Médio` has both an accent and a space — match it exactly, after `.trim()`ing each header cell.

Two rules that make this parser different from a naive header lookup:

- **Accept both the real export and the legacy `ticker,quantity,avgPrice` header.** The spec keeps an AC for the three-column format, so map each logical field from either spelling (`Ticker`/`ticker`, `Quantidade`/`quantity`, `Preco Médio`/`avgPrice`) rather than requiring one. Case-insensitive matching on the header cell is the cheapest way to cover both without a second parser.
- **Every other column is ignored, and that includes the 6 unnamed trailing ones and the classification columns** (`Grupo`, `Setor`, `Classificacao`, `Risco`, `Tipo`). Their presence is not an error — the user's real sheet has them, and [market-data](../../market-data/spec.md)'s assets CSV owns them. A duplicate `Preco Teto`/`Status` pair in the unnamed columns is ignored the same way.

Throw if the header resolves neither a ticker nor a quantity column: that means the file isn't a holdings CSV at all and should fail loudly rather than yield rows of `undefined`.

**Test:** `apps/api/src/portfolio/holdings-csv.spec.ts` (colocated unit spec) reading the `PORTFOLIO_US-2_T-3` fixtures: (1) `holdings-real-shape.csv` yields one `RawHoldingRow` per data row, with `ticker`/`quantity`/`avgPrice` pulled from the right columns — assert against a row whose `Quantidade` and `Preco Médio` differ so a transposed index fails, and specifically that `avgPrice` came from `Preco Médio` and **not** from the adjacent `Preco` column, which is the single most likely mis-mapping in this file; (2) rows with an empty `Ticker` still appear in the output with `ticker: ''` (filtering them is `T-5`'s job — the parser reports, it doesn't filter); (3) `holdings-legacy-3col.csv` parses to the same shape via the lowercase header; (4) a header with neither ticker nor quantity throws. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
