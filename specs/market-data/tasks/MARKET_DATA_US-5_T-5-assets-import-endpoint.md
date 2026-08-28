# MARKET_DATA_US-5_T-5: POST /market-data/assets/import

**Story:** [../stories/US-5-asset-classification-import.md](../stories/US-5-asset-classification-import.md)
**Status:** Done
**GitHub Issue:** #170 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** MARKET_DATA_US-5_T-4

Add `POST /market-data/assets/import` to the existing `MarketDataController` (`apps/api/src/market-data/market-data.controller.ts`, added by `MARKET_DATA_US-4_T-2`): a multipart CSV upload returning `{ created, updated, errors }` straight from `importAssetsCsv`.

Follow `CONVENTIONS.md` → "File uploads" and the working precedent in `RecommendedPortfoliosController.uploadWallet`: `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_UPLOAD_BYTES } }))` with Nest's default in-memory storage, `@UploadedFile() file: Express.Multer.File | undefined`, and an explicit `BadRequestException` when no file is attached rather than letting a later `.buffer` access throw a 500. Decode `file.buffer` to a UTF-8 string and delegate every bit of parsing to the service — the controller stays thin per `CONVENTIONS.md` → "Module structure". `MAX_CSV_UPLOAD_BYTES` currently lives as a private const in `recommended-portfolios.controller.ts`; the second consumer is the point at which it should move somewhere both can import rather than being copy-pasted.

Guard it with the shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`), as the sibling `GET /market-data/quote/:ticker` already is. This endpoint writes shared master data that every user's allocation view reads, so it needs the guard at least as much as the read endpoint does.

There are no non-file form fields, so no `@Body()` DTO is needed here — unlike `UploadWalletBodyDto`, which exists because that endpoint also takes `effectiveDate`/`sourceName`.

**Test:** `apps/api/test/market-data-assets-import.e2e-spec.ts` — extend the spec from `MARKET_DATA_US-5_T-4` (same suite, same scoped `afterEach`, so the two don't race each other over the `MDAS*` tickers) with HTTP-level cases via `supertest`, building the app with `configureApp(app)` before `app.init()` so the auth cookie is parsed (`CONVENTIONS.md` → "Testing"): (1) `POST /market-data/assets/import` with **no** auth cookie returns `401`; (2) with a valid `access_token` cookie and `assets-full.csv` attached as `file`, returns `200` with `created` matching the fixture's non-empty-`ticker` row count and `errors: []`; (3) with a valid cookie and **no** file attached, returns `400`, not `500`; (4) with a valid cookie and `assets-bad-values.csv`, returns `200` (partial success is not an HTTP error) with a non-empty `errors[]`; (5) after a successful import, `GET /portfolio/allocation?by=investmentStyle` for a user holding one of the imported tickers returns real slices rather than a single `"Unclassified"` one — the spec's closing AC, and the only place the whole point of this story is asserted end to end. It needs a `Holding` for that user (create it through `POST /portfolio/holdings`, so the suite doesn't hand-write another module's rows) and is the one case here that spans modules; keep its cleanup inside this suite's existing scoped `afterEach`. Confirm red first (no route exists, so the authed cases 404), then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
