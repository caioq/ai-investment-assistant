# PORTFOLIO_US-1_T-1: POST /portfolio/holdings

**Story:** [../stories/US-1-manage-holdings.md](../stories/US-1-manage-holdings.md)
**Status:** Not Started
**GitHub Issue:** #99 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-1, PORTFOLIO_SHARED_T-2

Add `POST /portfolio/holdings` taking `{ ticker, quantity, avgPrice }` (a `class-validator` DTO behind the global `ValidationPipe`, per `CONVENTIONS.md` → "Module structure" — `ticker` a non-empty string, `quantity`/`avgPrice` positive numbers) and returning the created `Holding`.

Three things happen in one request:

1. **Find-or-create the `Asset` by ticker.** The client sends a ticker; `Holding` references `Asset` by id. A ticker not yet in `Asset` gets a row created (spec AC-1, and market-data's Behavior Notes assume this is how assets come into existence). Normalise the ticker to uppercase before lookup, or `petr4` and `PETR4` create two `Asset` rows and quietly split one position in two — `Asset.ticker` is `@unique`, so this is a data-corruption bug, not a cosmetic one.
2. **Upsert the `Holding`** on `@@unique([userId, assetId])` with `userId` from `req.user.id` — never from the request body (spec API Contract preamble). Re-adding a held ticker updates `quantity`/`avgPrice` rather than inserting a duplicate (AC-2).
3. **Trigger the historical backfill** for a newly-created `Asset` only, by calling `MarketDataService.backfillHistory(asset.id)` — market-data built this capability in `MARKET_DATA_US-2_T-2` and explicitly left the call site to holding creation.

**`backfillHistory` must not be able to fail the user's request.** It reaches out to Yahoo Finance, which is unofficial and rate-limited, and it has no internal `try`/`catch` — an unhandled rejection there would turn a successful holding creation into a 500 with the row already written. Call it fire-and-forget with its own `.catch()` logging at `error` level, so a backfill failure degrades to "the chart starts flat" rather than "I can't add stocks."

**Test:** `apps/api/test/portfolio.e2e-spec.ts` — a new e2e spec built per `CONVENTIONS.md` → "Testing" (`Test.createTestingModule({ imports: [AppModule] })`, `configureApp(app)` before `.init()` so the auth cookie is parsed), with `MarketDataService` stubbed via `.overrideProvider(...)` so `backfillHistory` never hits live Yahoo Finance. Register + log in to get a session cookie, then:

1. `POST /portfolio/holdings` with `{ ticker: 'PETR4', quantity: 100, avgPrice: 30 }` for a ticker no `Asset` row exists for returns 2xx, and afterwards **both** an `Asset` with `ticker: 'PETR4'` and a `Holding` for that user exist — spec AC-1, asserted on the database, not just the response body.
2. Posting the **same** ticker again with `{ quantity: 150, avgPrice: 32 }` returns 2xx and leaves exactly **one** `Holding` row for that user, with `quantity: 150` — spec AC-2.
3. Posting `{ ticker: 'petr4', ... }` (lowercase) does not create a second `Asset`; there is still exactly one `Asset` row for `PETR4`.
4. `backfillHistory` is called once for the newly-created asset in case 1, and **not** called again in case 2 (the asset already existed).
5. With the stub's `backfillHistory` rejecting, the request still returns 2xx and the `Holding` is still persisted.
6. `POST /portfolio/holdings` with **no** auth cookie returns `401`.

Scope the `afterEach` cleanup to the rows this suite creates (`where: { ticker: { in: [...] } }`, `where: { email: '...' }`) rather than an unscoped `deleteMany()` — per `CONVENTIONS.md` → "Testing", e2e suites run in parallel against the same test Postgres and an unscoped delete races with other suites.

Confirm red first (no route exists, so every case 404s), then green.

**Done when:** the test above passes — cases 3 and 5 especially, since a straightforward implementation satisfies 1, 2, 4 and 6 while still corrupting on case-variant tickers and 500-ing when Yahoo is down.
