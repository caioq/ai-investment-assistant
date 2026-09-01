# ADVISOR_SHARED_T-1: AdvisorReport + AdvisorAnalysis schema

**Shared by:** US-1, US-2, US-3
**Status:** Not Started
**GitHub Issue:** #183 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `AdvisorReport` and `AdvisorAnalysis` models to `apps/api/prisma/schema.prisma` **exactly as written in the spec's Data Model block**, and generate the migration. The spec's Prisma is copy-ready and already follows `CONVENTIONS.md` → "Module structure" (UUIDv7 `@id @default(uuid(7)) @db.Uuid`, `snake_case` `@@map`/`@map`, `@db.Uuid` on FK scalars) — transcribe it, don't re-derive it.

Add the back-relations Prisma won't compile without: `advisorReports AdvisorReport[]` and `advisorAnalyses AdvisorAnalysis[]` on `User` (owned by [auth](../../auth/spec.md), but Prisma requires both sides), and `analyses AdvisorAnalysis[]` on `AdvisorReport`.

Two details that are easy to lose in transcription and hard to notice later:

- `AdvisorAnalysis.advisorReportId` is **nullable** with an optional relation. An analysis generated without a report is a first-class case, not a degraded one (`POST /advisor/analyze` without `advisorReportId` is its own spec AC).
- `@@index([userId, createdAt])` is what makes `GET /advisor/analysis/latest` a cheap lookup instead of a scan-and-sort of every analysis the user has ever generated. That table only grows — nothing ever deletes a row — so the index matters more here than in most models.

`strengths`, `risks`, `recommendations`, `impactMetrics` and `recommendedPortfolioIds` are `Json` columns holding arrays. `rawText` is `@db.Text`, not the default `String` — report prose runs well past what a bounded varchar would take.

**Test:** `apps/api/test/advisor-schema.e2e-spec.ts` (e2e, per `CONVENTIONS.md` → "Testing", since it needs a real Postgres), with an `afterEach` scoped to this suite's own fixture email: creates a `User`, an `AdvisorReport` with `rawText` and an `AdvisorAnalysis` linked to it, then asserts (1) both rows read back with their `Json` fields round-tripping as arrays (not strings); (2) an `AdvisorAnalysis` created with `advisorReportId: null` persists successfully — the nullable-relation case; (3) `prisma.advisorAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })` returns the most recent of two rows. Confirm red first (the models don't exist, so the client has no `advisorReport` property), then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
