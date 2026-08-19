# RECOMMENDED_PORTFOLIOS_SHARED_T-3: CSV fixtures for the three wallet exports

**Shared by:** US-1, US-2, US-3
**Status:** Done
**GitHub Issue:** #142 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Commit three CSV fixtures at `apps/api/test/fixtures/recommended-portfolios/` — `overall-recommended.csv`, `dividends.csv`, `small-caps.csv` — that every parser unit test and upload e2e test in this module reads.

**These are synthetic, not copies of the real exports, because this repository is public.** The spec's AC-1 says "uploading each of the three real exports", and the obvious reading is to commit the user's files. Those contain a research house's proprietary output — real tickers with their ceiling prices, buy/sell calls and allocation weights, from a paid subscription. Committing them republishes it. Nothing in the ACs actually depends on the *values* being real; every one of them depends on the file's **shape**. So the fixtures reproduce the shape exactly and invent the data.

Each fixture must preserve, byte for byte where it matters:

- **The exact header, in the exact column order.** Overall: `EMPRESA,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,ALOCACAO_SUGERIDA,RECOMENDACAO,DY_2026,RISCO`. Dividends: `CATEGORIA,EMPRESA,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,RECOMENDACAO,MARGEM_DE_SEGURANCA,PRECO_TETO_2,DY_2026,RISCO`. Small Caps: `EMPRESA,SETOR,PRECO_ATUAL,PRECO_TETO,VARIACAO,CODIGO,RECOMENDACAO,MARGEM_DE_SEGURANCA,DY_2025,RISCO`. The differing order is what `RECOMMENDED_PORTFOLIOS_US-1_T-2` exists to survive — normalising it here would make that task's test vacuous.
- **Quoted Brazilian formatting**: `"R$ 47,50"`, `"8,00%"`, and at least one negative `"-6,71%"` in `MARGEM_DE_SEGURANCA`. Include one value above a thousand (`"R$ 1.234,56"`) so the `.` thousands separator is covered — the real files happen not to have one today, and a parser that only strips `,` passes on them and breaks the first time a wallet holds an expensive ticker.
- **`DY_2026` in Overall and Dividends, `DY_2025` in Small Caps** — the year difference is what makes prefix-matching necessary.
- **Overall's tickerless row**: a final line with a `label`, an `ALOCACAO_SUGERIDA`, and every other field empty (`Renda Fixa - LFT Tesouro,,,,,"15,00%",,,`). Keep its weight such that the equity rows sum to 85 and the file sums to **100**, matching the real export's structure.
- **`RECOMENDACAO` values** covering `COMPRA`, `NEUTRO` and `VENDA` across the set — Small Caps is the only real file with a `VENDA`, so put one there.
- **Dividends' `PRECO_TETO_2` disagreeing with `PRECO_TETO`** on at least one row, so `US-1_T-3`'s "ignore the second column" assertion has something to catch.
- **`RISCO` and `SETOR` populated**, so `US-1_T-3` can assert they are *not* persisted rather than trivially passing on absent data.

Use tickers namespaced to this suite rather than real B3 codes — `CONVENTIONS.md` → "Testing" requires fixtures unique per suite, and reusing `PETR4`/`VALE3` would race the portfolio and market-data e2e suites against the same test Postgres.

Add a short `README.md` in that directory recording why the fixtures are synthetic and that their *shape* is the contract — otherwise the next person to touch them will "correct" the odd column order or the empty row.

**Test:** The fixtures have no behaviour of their own, so this task's verification is a guard that they haven't drifted from the shape the other tasks rely on: `apps/api/test/fixtures/recommended-portfolios/fixtures.spec.ts` asserts, by reading each file, that (1) each has the exact expected header string; (2) Overall contains exactly one row with an empty `CODIGO` and a non-empty `ALOCACAO_SUGERIDA`; (3) Overall's `ALOCACAO_SUGERIDA` values sum to `100` after stripping `%`/`,`; (4) at least one value matches `R$ \d\.\d{3},\d{2}` (thousands separator) and one `MARGEM_DE_SEGURANCA` is negative; (5) the three `RECOMENDACAO` values each appear at least once across the set. Confirm red first (no fixtures exist), then green.

**Done when:** the three fixtures and their `README.md` exist and the shape test above passes.
