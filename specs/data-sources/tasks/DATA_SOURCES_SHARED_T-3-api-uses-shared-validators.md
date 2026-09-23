# DATA_SOURCES_SHARED_T-3: API importers consume the shared validators

**Shared by:** US-2, US-3, US-4
**Status:** Done
**GitHub Issue:** #310 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-2

Refactor the API's three CSV importers to call `packages/shared`'s `parseCsv` + validators instead of their own parsing:

- `apps/api/src/market-data/assets-csv.ts` and `asset-row.ts` → `validateAssetsRows`
- `apps/api/src/recommended-portfolios/wallet-csv.ts` → `validateWalletRows`
- the holdings parser in `apps/api/src/portfolio/portfolio.service.ts` → `validateHoldingsRows`

**This is a refactor with no behaviour change.** Every existing API test must pass untouched: the same status codes, the same `{ created, updated, errors[] }` shapes, the same `` `row ${n}: ${message}` `` error strings, assets still partially importing and wallets still rejecting a whole file on one bad row. If a shared validator's wording differs from the API's current message, change the **validator** to match the API, not the API's tests — the point is that the browser preview predicts what the server already does.

Holdings: if the portfolio module's header-name parser (PR #176) hasn't landed, refactor only assets and wallets and say so in the PR, rather than changing the holdings format here.

**Test:** no new test file of its own — the existing suites are the contract:
- `apps/api/src/market-data/assets-csv.spec.ts`, `asset-row.spec.ts`, `market-data.service.spec.ts`
- `apps/api/src/recommended-portfolios/wallet-csv.spec.ts` and its service spec
- `apps/api/test/market-data-assets-import.e2e-spec.ts`, `recommended-portfolios.e2e-spec.ts`, `portfolio.e2e-spec.ts`

all pass **unmodified**. Add one new assertion in `apps/api/src/market-data/assets-csv.spec.ts` proving the shared function is the one being used (e.g. spy on the shared export, or assert a validator-only behaviour that the old local code lacked).

**Done when:** the whole `apps/api` unit + e2e suite passes with those specs unedited, and `grep -rn "split(','\|split(\"\\\\n\")" apps/api/src` shows no CSV parsing left outside `packages/shared`.
