# DATA_SOURCES_SHARED_T-5: `GET /data-sources/summary`

**Shared by:** US-1, US-2, US-3, US-4, US-5
**Status:** Not Started
**GitHub Issue:** #312 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_SHARED_T-4

Add `GET /data-sources/summary` to the `data-sources` module, returning everything the four source cards and the preview need in one call, exactly as spec → API Contract declares:

```ts
{
  assets:   { count, tickers: string[], lastImportAt: string | null },
  holdings: { count, lastImportAt: string | null },
  wallets:  { walletType, effectiveDate, sourceName, positions }[],   // latest per type
  report:   { id, title, publisher, publishedAt, fileName, uploadedAt } | null,
}
```

- `AuthGuard`; holdings, wallets and the report are scoped to `req.user.id`. **Assets are global** (spec → Data ownership), so `assets.count`/`tickers` are not user-scoped.
- `lastImportAt` for assets and holdings comes from the newest matching `ImportLog` — `Asset` has no timestamps, so it cannot come from the rows.
- `wallets` holds at most one entry per `WalletType`, the newest by `effectiveDate`, with `positions` = that version's holding count. Types never imported are simply absent.
- `report` is the user's newest `AdvisorReport`, or `null`.
- Compose the existing portfolio / recommended-portfolios / advisor services rather than querying their tables directly (spec → API Contract).

`report.title`/`publisher`/`publishedAt` are `null` until `DATA_SOURCES_US-5_T-1` adds those columns; the field shape doesn't change when it does.

**Test:** `apps/api/test/data-sources.e2e-spec.ts` (extend the file from SHARED_T-4):
1. Without a cookie: 401.
2. A fresh user gets `holdings.count === 0`, `wallets: []`, `report: null`.
3. After seeding two holdings and posting an `ImportLog` for `HOLDINGS`, `holdings.count === 2` and `lastImportAt` equals that log's `createdAt`.
4. After uploading the same wallet type twice with different `effectiveDate`s, `wallets` has exactly one entry for that type, carrying the newer date.
5. `assets.tickers` contains a ticker created by another user's import (assets are global), while that user's holdings are not visible.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
