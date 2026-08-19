# RECOMMENDED_PORTFOLIOS_US-1_T-3: row normalisation

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Done
**GitHub Issue:** #145 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_US-1_T-1, RECOMMENDED_PORTFOLIOS_US-1_T-2

Map a name-keyed raw row (from `RECOMMENDED_PORTFOLIOS_US-1_T-2`) onto the `RecommendedHolding` shape, using `parseBrazilianNumber` (`RECOMMENDED_PORTFOLIOS_US-1_T-1`) for every numeric field.

Mapping, per the spec's Data Model and Behavior Notes:

| Source | Target |
|---|---|
| `CODIGO` | `ticker` for `Asset` resolution — uppercased; empty → the row has no asset |
| `EMPRESA` | `label` (always present) |
| `PRECO_TETO` | `limitPrice` |
| `ALOCACAO_SUGERIDA` | `targetWeightPct` |
| `RECOMENDACAO` | `recommendation` |
| `DY_*` | `dividendYieldPct` |
| `MARGEM_DE_SEGURANCA` | `marginOfSafetyPct` |

**`RECOMENDACAO` normalises to English**: `COMPRA` → `BUY`, `NEUTRO` → `NEUTRAL`, `VENDA` → `SELL`. An unrecognised non-empty value is a **row error**, not a silent `null` — a new call the research house introduces must surface rather than disappear. An empty value is `null`.

**A row with an empty `CODIGO` keeps its `label` and `targetWeightPct` and resolves no asset.** This is Overall's `Renda Fixa - LFT Tesouro` line: a real 15% allocation with no ticker. Its equity rows sum to 85, so dropping it loses a real allocation and makes the wallet look fully invested in equities.

**An absent column yields `null`, never `0`.** `targetWeightPct` is `null` for every Dividends and Small Caps row because those wallets are selections, not allocations — `0` would read as "allocate nothing to this".

**`RISCO`, `SETOR`, `CATEGORIA`, `PRECO_ATUAL`, `VARIACAO` and `PRECO_TETO_2` are not mapped anywhere.** All six are spec Non-Goals. `RISCO` is the tempting one — its values (`AAA`/`A`/`B`/`C`) are valid `RiskRating` members — but risk rating and sector are `Asset` columns owned by [market-data](../../market-data/spec.md) and arrive from a different source later; a per-wallet opinion must not become authoritative shared master data. `PRECO_TETO_2` disagrees with `PRECO_TETO` on real rows, and `PRECO_TETO` is authoritative.

**Test:** `apps/api/src/recommended-portfolios/wallet-csv.spec.ts` (extends the file from `RECOMMENDED_PORTFOLIOS_US-1_T-2`), reading the three fixtures:

1. **Spec AC-3** — an Overall row maps `"R$ 47,50"` → `limitPrice: 47.5` and `"8,00%"` → `targetWeightPct: 8`; a Small Caps row maps `"-6,71%"` → `marginOfSafetyPct: -6.71`.
2. **Spec AC-4** — `COMPRA`/`NEUTRO`/`VENDA` map to `BUY`/`NEUTRAL`/`SELL`; a row with `RECOMENDACAO: 'MANTER'` produces a row error rather than `null`.
3. **Spec AC-1** — Overall's tickerless row normalises to `{ ticker: null, label: 'Renda Fixa - LFT Tesouro', targetWeightPct: 15 }` and is **not** dropped: assert the normalised row count equals the fixture's data-row count.
4. **Spec AC-2** — every Dividends and Small Caps row has `targetWeightPct === null`, explicitly not `0`.
5. **Spec AC-7** — no normalised row carries a `RISCO`, `SETOR`, `CATEGORIA`, `PRECO_ATUAL`, `VARIACAO` or `PRECO_TETO_2` value under any key. Assert on the object's keys, not on individual fields, so a field added later is caught.
6. **Spec AC-6** — a Dividends row whose `PRECO_TETO` and `PRECO_TETO_2` differ maps `limitPrice` from `PRECO_TETO`.
7. Lowercase `CODIGO` uppercases, matching `findOrCreateAsset`'s normalisation.

Confirm red first (no normalisation exists), then green.

**Done when:** the test above passes — cases 3, 4 and 5 especially: the first is a real allocation that a naive filter silently discards, the second is the difference between "not published" and "zero", and the third is the guard against quietly persisting master data this module doesn't own.
