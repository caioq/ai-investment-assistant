# DATA_SOURCES_SHARED_T-2: Shared row validators

**Shared by:** US-2, US-3, US-4
**Status:** Not Started
**GitHub Issue:** #309 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-1

Add `packages/shared/src/csv/validators.ts` with one validator per CSV source, each taking `parseCsv` output plus context and returning the shape the preview and the server both read:

```ts
type Issue = { row?: number; severity: 'error' | 'warning'; message: string };
type ValidationResult = { columns: string[]; rows: ParsedRow[]; rowIssues: Issue[]; fileIssues: Issue[] };

validateAssetsRows(parsed, { knownCategories?: string[] })
validateHoldingsRows(parsed, { knownTickers: string[] })
validateWalletRows(parsed, { knownTickers: string[]; walletType: WalletType })
```

Rules come from spec → Behavior Notes → "The CSV formats are the ones the importers already accept", and must match what the API accepts exactly:

- **Assets** — required `ticker`; optional `sector`, `subSector`, `investmentStyle`, `riskRating`, `assetType`. An unrecognised enum value is a row **error** naming the column and value. A row with an empty `ticker` is skipped silently (no issue, not counted). An absent column and a present-but-empty cell mean different things, so the result records which columns were present.
- **Holdings** — required `Ticker`, `Quantidade`, `Preco Médio`; Brazilian numbers (`"R$ 589.394,17"` → `589394.17`); non-positive or unparseable quantity/price is a row error; a ticker not in `knownTickers` is a row **warning**.
- **Wallets** — required `CODIGO`, `PRECO_TETO`; `RECOMENDACAO` must be `COMPRA|NEUTRO|VENDA`; the `DY_` column is matched by prefix; a ticker not in `knownTickers` is a row warning; `ALOCACAO_SUGERIDA` summing outside 100% ± 0.5% is a **file** warning naming the actual total.
- Missing required columns are a **file error** listing every missing name.

Also export the column definitions (required + optional, per source and per wallet type) that `SHARED_T-9` generates templates from, so the template cannot drift from the parser.

**Test:** `packages/shared/src/csv/validators.test.ts` (Vitest), per validator:
1. A clean file yields no issues and one row per data row.
2. Assets: an unrecognised `riskRating` yields exactly one row error naming the row number, column and value; a row with an empty `ticker` produces no issue **and** no row.
3. Assets: a file without a `ticker` header yields one file error listing `ticker`.
4. Holdings: `"R$ 1.234,56"` parses to `1234.56`; `0` quantity is a row error; a ticker missing from `knownTickers` is a row warning.
5. Wallets: `RECOMENDACAO: TALVEZ` is a row error; weights summing to 92 yield one file warning whose message contains `92`; weights summing to 100.3 yield none.
6. Wallets: the dividends column set differs from the others (assert via the exported definitions).

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
