# MARKET_DATA_US-5_T-3: normalizeAssetRow enum mapping

**Story:** [../stories/US-5-asset-classification-import.md](../stories/US-5-asset-classification-import.md)
**Status:** Done
**GitHub Issue:** #168 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `apps/api/src/market-data/asset-row.ts` exporting `normalizeAssetRow(row: RawAssetRow)`, which maps a parsed row to a persistable shape and **throws** on a value it can't map — the same contract as `normalizeWalletRow` (`apps/api/src/recommended-portfolios/wallet-row.ts`), per `CONVENTIONS.md` → "CSV parsing": a straight-line mapper with no error accumulator threaded through it, composing with the caller's per-row try/catch.

Rules, from the spec's Behavior Notes:

- `ticker` is uppercase-normalised and trimmed. (`MarketDataService.findOrCreateAsset` also uppercases — normalising here too keeps the mapper's output canonical for comparison in tests rather than relying on the persistence layer to fix it.)
- `sector` and `subSector` are **free text**, trimmed, passed through unchanged. Do not uppercase, translate, or validate them against any list — the spec is explicit that they're the user's own labels and are already a mix of English (`FINANCIAL`, `REAL ESTATE`) and Portuguese (`BANCOS`, `MINERAÇÃO`).
- `investmentStyle`, `riskRating`, `assetType` must each be a member of their Prisma enum (`InvestmentStyle`, `RiskRating`, `AssetType`) and throw otherwise. Validate against the generated enum objects rather than a hand-written string union, so adding an enum value never needs this file edited in lockstep.
- A `''` value maps to an explicit `null` (clear the field); an `undefined` value maps to *absent from the returned object entirely* (leave the field alone). These are different outcomes and T-4 depends on telling them apart — returning `null` for both is the bug this task exists to prevent.

The thrown message must name the offending column and value (`unrecognised riskRating "Z"`), because it becomes the user-visible `row N: reason` text in `errors[]`.

**Test:** `apps/api/src/market-data/asset-row.spec.ts` (colocated unit spec) built on inline `RawAssetRow` objects, no fixture needed: (1) a fully-populated row maps every field, with `ticker` uppercased from lowercase input; (2) `sector`/`subSector` with mixed case and accents (`Mineração`) survive verbatim; (3) `riskRating: 'Z'` throws with a message containing both `riskRating` and `Z`; (4) `investmentStyle: 'DIVIDENDOS'` throws — the leftover-Portuguese case the spec calls out, which must fail rather than silently null; (5) `riskRating: ''` produces `riskRating: null` in the result while `riskRating: undefined` produces a result with **no** `riskRating` key (`expect('riskRating' in result).toBe(false)`), the pair that pins the clear-vs-leave-alone distinction. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
