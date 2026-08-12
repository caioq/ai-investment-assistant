# PORTFOLIO_US-2_T-2: POST /portfolio/holdings/upload-csv

**Story:** [../stories/US-2-csv-import.md](../stories/US-2-csv-import.md)
**Status:** Done
**GitHub Issue:** #105 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-2_T-1

Add `POST /portfolio/holdings/upload-csv` accepting a multipart file upload and returning `{ created, updated, errors[] }` from `PortfolioService.importHoldingsCsv(req.user.id, csv)`.

Use Nest's `FileInterceptor` (`@nestjs/platform-express`, already an `apps/api` dependency) with in-memory storage — the file is parsed immediately and never needs to touch disk. `@types/multer` is required for the `Express.Multer.File` type and is **not** currently installed; add it as a dev dependency or the build fails on a missing global type rather than on anything to do with this endpoint.

Keep the controller thin per `CONVENTIONS.md` → "Module structure": decode the buffer to a UTF-8 string and delegate. No parsing logic here — that's `PORTFOLIO_US-2_T-1`, where it's unit-testable without multipart.

Return `400` when no file is attached. Cap the upload size via the interceptor's `limits.fileSize` (1 MB is far beyond any realistic holdings file) — an unbounded in-memory upload on an authenticated endpoint is a trivial way to exhaust the process's memory.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie, using supertest's `.attach()` to send a real multipart request:

1. Attaching a CSV with 3 valid rows and 1 malformed returns `200` with `{ created: 3, errors: [<1 entry>] }`, and a follow-up `GET /portfolio/holdings` shows exactly 3 holdings — spec AC-3 end-to-end, through the real multipart path rather than a direct service call.
2. Posting with **no** file attached returns `400`, not `500`.
3. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the test above passes.
