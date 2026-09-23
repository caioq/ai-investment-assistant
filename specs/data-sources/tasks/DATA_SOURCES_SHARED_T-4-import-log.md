# DATA_SOURCES_SHARED_T-4: `ImportLog` model and `/data-sources/imports`

**Shared by:** US-2, US-3, US-4, US-5, US-6
**Status:** Not Started
**GitHub Issue:** #311 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `ImportLog` model, the `ImportSource`/`ImportStatus` enums and their migration exactly as spec → Data Model declares them (UUIDv7 `@db.Uuid` id, `@@map("import_logs")`, `@@index([userId, createdAt])`, `errors Json?` for the rejected rows), plus `User.importLogs`.

Create `apps/api/src/data-sources/` (module, controller, service) with:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/data-sources/imports?limit=20` | — | the user's `ImportLog[]`, newest first, default limit 20 |
| POST | `/data-sources/imports` | `{ source, walletType?, fileName, records, status, message?, errors?: string[] }` | created `ImportLog` |

Both use the shared `AuthGuard` and scope every row to `req.user.id` — the client never sends a user id (CONVENTIONS.md → "Auth"). Validate the body with a DTO: `source` and `status` are `@IsEnum`, `walletType` is optional and only meaningful when `source` is `WALLET`, `records` is `@IsInt() @Min(0)`, `errors` is an optional string array.

**Test:** `apps/api/test/data-sources.e2e-spec.ts` (real `AppModule` + `configureApp`, scoped cleanup and suite-unique emails per CONVENTIONS.md → "Testing"):
1. `POST /data-sources/imports` without a cookie returns 401.
2. Posting `{ source: 'ASSETS', fileName: 'assets.csv', records: 8, status: 'IMPORTED', errors: ['row 3: …', 'row 7: …'] }` returns 201 with both error strings preserved in order.
3. `GET /data-sources/imports` returns that row, and a second user's identical post is **not** visible to the first user.
4. Rows come back newest first, and `?limit=1` returns exactly one.
5. `source: 'NOPE'` returns 400.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
