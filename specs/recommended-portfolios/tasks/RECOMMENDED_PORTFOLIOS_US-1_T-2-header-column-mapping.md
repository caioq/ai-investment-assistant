# RECOMMENDED_PORTFOLIOS_US-1_T-2: header-driven column resolution

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Not Started
**GitHub Issue:** #144 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-2, RECOMMENDED_PORTFOLIOS_SHARED_T-3

Parse a wallet CSV into raw rows keyed by **column name**, resolving the header row into a name→index map, per the spec's Behavior Note: *one parser, driven by header names — not one parser per wallet, and never by column position.*

Parse with `csv-parse/sync` per `CONVENTIONS.md` → "CSV parsing" (`columns: false`, `relax_column_count: true`, `skip_empty_lines: true`), then build the map from row 0. Never `split(',')` — the values are quoted precisely because they contain commas.

Resolve `CODIGO`, `EMPRESA`, `PRECO_TETO`, `ALOCACAO_SUGERIDA`, `RECOMENDACAO`, `MARGEM_DE_SEGURANCA` by exact name, and the dividend-yield column **by `DY_` prefix**. A column absent from a given file resolves to `undefined` for every row rather than throwing — that's how `ALOCACAO_SUGERIDA` behaves for Dividends and Small Caps, and `MARGEM_DE_SEGURANCA` for Overall.

Require `CODIGO` and `PRECO_TETO` to be present in the header; a file missing either is not one of these exports and should fail loudly rather than yield rows of `null`.

Two properties this task exists to guarantee, both of which a positional parser satisfies on exactly one of the three files:

- **Column order differs.** `EMPRESA` is 1st in Overall and Small Caps but 2nd in Dividends, which leads with `CATEGORIA`. Positional indexing reads the wrong field and produces plausible garbage rather than an error.
- **The dividend-yield column carries its projection year** — `DY_2026` in Overall and Dividends, `DY_2025` in Small Caps. Matching the exact name silently drops the field the year it rolls over, which is a data-loss bug that surfaces months later.

**Test:** `apps/api/src/recommended-portfolios/wallet-csv.spec.ts` — a unit test reading the three fixtures from `RECOMMENDED_PORTFOLIOS_SHARED_T-3`:

1. All three files parse without error and yield the expected row counts.
2. **Spec AC-6** — Dividends, whose columns are in a different order and which carries `CATEGORIA` and `PRECO_TETO_2` that no other file has, resolves `EMPRESA`/`CODIGO`/`PRECO_TETO` to the same logical fields as the other two. Assert a specific row's `EMPRESA` value, so a positional read fails here rather than passing with `CATEGORIA`'s value.
3. **Spec AC-5** — the dividend-yield column resolves from `DY_2026` in Overall/Dividends and `DY_2025` in Small Caps, with no per-wallet branching in the implementation.
4. `ALOCACAO_SUGERIDA` resolves for Overall and is `undefined` for Dividends and Small Caps.
5. A CSV whose header lacks `CODIGO` throws, rather than returning rows with everything `null`.

Confirm red first (no parser exists), then green.

**Done when:** the test above passes — case 2 in particular, since it's the assertion that fails loudly if anyone reintroduces positional indexing.
