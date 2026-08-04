# MARKET_DATA_US-4_T-2: GET /market-data/quote/:ticker debug endpoint

**Story:** [../stories/US-4-on-demand-refresh.md](../stories/US-4-on-demand-refresh.md)
**Status:** Done
**GitHub Issue:** #68 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-4_T-1

Add `MarketDataController` (`apps/api/src/market-data/market-data.controller.ts`) with the spec's one optional endpoint: `GET /market-data/quote/:ticker` → `{ ticker, price, changePct, updatedAt }`, resolving the `Asset` by ticker and delegating to `getOrRefreshPrice(asset.id)` from `MARKET_DATA_US-4_T-1`. Return `404` when the ticker has no `Asset` row. Keep the controller thin per `CONVENTIONS.md` → "Module structure" — no price logic in it.

Guard it with the shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`, from `AUTH_US-3_T-1`), per `CONVENTIONS.md` → "Auth": *"Every protected controller uses a shared `AuthGuard`."* The auth spec's own story deliberately left applying the guard in other modules to those modules — this is that follow-through for `market-data`. Although the spec labels this endpoint debug-only, it triggers a live upstream fetch, so leaving it unauthenticated would hand an anonymous caller a lever on the Yahoo Finance request volume that the whole module is built to protect.

**Test:** `apps/api/test/market-data.e2e-spec.ts` — a new e2e spec following `CONVENTIONS.md` → "Testing" (build the app via `Test.createTestingModule({ imports: [AppModule] })`, then `configureApp(app)` before `app.init()` so cookies/pipes match production): (1) `GET /market-data/quote/PETR4` with **no** auth cookie returns `401`; (2) with a valid `access_token` cookie (register + login, as in `apps/api/test/auth.e2e-spec.ts`) and a seeded `Asset` for `PETR4`, returns `200` with `{ ticker, price, changePct, updatedAt }`; (3) with a valid cookie and an unknown ticker, returns `404`. Confirm red first (no route exists, so all three 404 rather than 401/200/404-for-the-right-reason), then green.

**Done when:** the test above passes.
