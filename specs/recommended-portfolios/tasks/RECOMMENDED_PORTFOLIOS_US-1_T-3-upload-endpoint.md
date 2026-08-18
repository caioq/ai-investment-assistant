# RECOMMENDED_PORTFOLIOS_US-1_T-3: POST /advisor/recommended-portfolios/upload

**Story:** [../stories/US-1-upload-wallet-csv.md](../stories/US-1-upload-wallet-csv.md)
**Status:** Not Started
**GitHub Issue:** #135 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-1, RECOMMENDED_PORTFOLIOS_US-1_T-1, RECOMMENDED_PORTFOLIOS_US-1_T-2

Add `POST /advisor/recommended-portfolios/upload` per the spec's API Contract: `?wallet=DIVIDENDS|OVERALL_RECOMMENDED|SMALL_CAPS`, a multipart CSV, and an optional `effectiveDate` form field defaulting to today. Returns the created `RecommendedPortfolio` with its `RecommendedHolding[]`.

Follow the multipart pattern in `CONVENTIONS.md` → "File uploads": `@UseInterceptors(FileInterceptor('file', { limits: { fileSize } }))` with in-memory storage, `@UploadedFile() file: Express.Multer.File | undefined`, and a `BadRequestException` when no file is attached rather than a 500 from a later `.buffer` access. Keep the controller thin — decode the buffer to UTF-8 and delegate; parsing belongs to `RECOMMENDED_PORTFOLIOS_US-1_T-2`.

Validate `wallet` with an `@IsIn([...])` (or `@IsEnum(WalletType)`) query DTO behind the global `ValidationPipe` and return `400` for anything else — an unrecognised wallet must not fall through to a default, which would file one research house's Small Caps list under Dividends. `effectiveDate` parses to a date at UTC midnight (matching the column's `@db.Date`) and defaults to today when absent.

Then, for the validated rows: resolve each ticker via `MarketDataService.findOrCreateAsset` (`RECOMMENDED_PORTFOLIOS_US-1_T-1`), creating the `Asset` when unseen — spec AC-3 — and **ignore its `wasCreated`**: no backfill is triggered here, per that task's reasoning. Write one `RecommendedPortfolio` with `userId` from `req.user.id` (never the request body) and its `RecommendedHolding` rows, in a single `prisma.$transaction` / nested `create` so a mid-write failure can't leave a wallet with some of its holdings.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` — a new e2e spec per `CONVENTIONS.md` → "Testing" (`Test.createTestingModule({ imports: [AppModule] })`, `configureApp(app)` before `.init()`), with `MarketDataService` stubbed via `.overrideProvider(...)` so nothing reaches live Yahoo Finance. Register + log in for a cookie, then, using supertest's `.attach()`:

1. Uploading a 3-row CSV for `?wallet=DIVIDENDS` returns 2xx with the created portfolio and its 3 holdings, and the rows exist in the database with `walletType: 'DIVIDENDS'`.
2. **Spec AC-3** — a row whose ticker has no `Asset` creates it, and the resulting `RecommendedHolding.assetId` points at that new row (assert the join, not just that an `Asset` appeared).
3. **Spec AC-4 end-to-end** — a CSV containing a `targetWeightPct` of `150` returns `400`, and **no** `RecommendedPortfolio` row was created.
4. Omitting `effectiveDate` defaults it to today (UTC midnight); supplying one uses it.
5. `?wallet=BOGUS` returns `400`; a request with no file attached returns `400`, not `500`.
6. No auth cookie returns `401`.

Scope the `afterEach` cleanup to rows this suite creates and use tickers unique to it — per `CONVENTIONS.md` → "Testing", e2e suites run in parallel against one Postgres, and scoping to a ticker another suite also uses is not isolation.

Confirm red first (no route exists, so every case 404s), then green.

**Done when:** the tests above pass — case 3 especially, since it's the whole-file-rejection guarantee proved through the real HTTP path rather than at the service boundary.
