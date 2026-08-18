# RECOMMENDED_PORTFOLIOS_US-1_T-6: POST /advisor/recommended-portfolios/upload

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Not Started
**GitHub Issue:** #148 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-1, RECOMMENDED_PORTFOLIOS_US-1_T-4, RECOMMENDED_PORTFOLIOS_US-1_T-5

Add `POST /advisor/recommended-portfolios/upload` per the spec's API Contract: `?wallet=DIVIDENDS|OVERALL_RECOMMENDED|SMALL_CAPS`, a multipart CSV file, and optional form fields `effectiveDate` (default: today) and `sourceName`. Returns the created `RecommendedPortfolio` with its `RecommendedHolding[]`.

Follow the multipart pattern in `CONVENTIONS.md` → "File uploads": `@UseInterceptors(FileInterceptor('file', { limits: { fileSize } }))` with in-memory storage, `@UploadedFile() file: Express.Multer.File | undefined`, and a `BadRequestException` when no file is attached rather than a 500 from a later `.buffer` access. Keep the controller thin — decode the buffer to UTF-8 and delegate; parsing and validation belong to `US-1_T-2`–`T-4`.

Validate `wallet` with an `@IsEnum(WalletType)` query DTO behind the global `ValidationPipe`, returning `400` for anything else. `wallet` is explicit rather than inferred from the filename, per the spec — the export's name is the user's to change, and guessing wrong files one wallet's recommendations under another. `effectiveDate` parses to UTC midnight (matching the column's `@db.Date`) and defaults to today.

For validated rows: resolve each non-empty ticker via `MarketDataService.findOrCreateAsset` (`US-1_T-5`), **ignoring `wasCreated`** — no backfill here, per that task. Rows with no ticker get `assetId: null`. Write the `RecommendedPortfolio` with `userId` from `req.user.id` (never the request body) and its `RecommendedHolding` rows in a **single nested `create`/`$transaction`**, so a mid-write failure can't leave a wallet holding some of its rows.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` — a new e2e spec per `CONVENTIONS.md` → "Testing" (`Test.createTestingModule({ imports: [AppModule] })`, `configureApp(app)` before `.init()`), with `MarketDataService.backfillHistory` stubbed via `.overrideProvider(...)` so nothing reaches live Yahoo Finance. Register + log in for a cookie, then use supertest's `.attach()` with the fixtures from `RECOMMENDED_PORTFOLIOS_SHARED_T-3`:

1. **Spec AC-1** — each of the three fixtures uploads successfully under its matching `?wallet=`, and every data row is persisted. For Overall, assert the tickerless row landed with `assetId: null`, its `label`, and `targetWeightPct: 15`.
2. **Spec AC-2** — after uploading Overall, its rows carry `targetWeightPct`; after Dividends or Small Caps, every row's `targetWeightPct` is `null`, not `0`.
3. **Spec AC-9** — a row whose ticker had no `Asset` creates it, and the resulting `RecommendedHolding.assetId` points at that row (assert the join, not merely that an `Asset` appeared).
4. **Spec AC-7** — after uploading all three, no `Asset` touched by the upload has a non-null `riskRating` or `sector`, even though every fixture publishes `RISCO` and Small Caps publishes `SETOR`.
5. **Spec AC-8 end-to-end** — a fixture-derived CSV with a `targetWeightPct` of `"150,00%"` returns `400`, and **no** `RecommendedPortfolio` row exists afterwards.
6. `?wallet=BOGUS` returns `400`; no file attached returns `400`, not `500`.
7. Omitting `effectiveDate` defaults it to today at UTC midnight; supplying one uses it. `sourceName` persists when supplied.
8. No auth cookie returns `401`.

Scope the `afterEach` cleanup to rows this suite creates, and rely on the fixtures' suite-namespaced tickers — per `CONVENTIONS.md` → "Testing", e2e suites run in parallel against one Postgres, and scoping to a ticker another suite also uses is not isolation.

Confirm red first (no route exists, so every case 404s), then green.

**Done when:** the tests above pass — cases 1, 4 and 5 in particular: the first proves the real export shape round-trips, the second guards master data this module doesn't own, and the third proves whole-file rejection through the real HTTP path rather than at the service boundary.
