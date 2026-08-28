# ADVISOR_US-2_T-4: POST /advisor/analyze

**Story:** [../stories/US-2-generate-analysis.md](../stories/US-2-generate-analysis.md)
**Status:** Not Started
**GitHub Issue:** #190 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_US-2_T-3

Add `POST /advisor/analyze` accepting `{ advisorReportId? }` and returning the created `AdvisorAnalysis`, delegating to `AdvisorService.analyze(req.user.id, advisorReportId)`.

Validate the body with a `class-validator` DTO behind the global `ValidationPipe` (`CONVENTIONS.md` → "Module structure" — no ad hoc checks in the controller): `@IsOptional() @IsUUID()` on `advisorReportId`. The `@IsUUID()` matters beyond tidiness — the id goes into a Prisma `@db.Uuid` lookup, and a non-UUID string surfaces as a Prisma error rather than a clean 400 without it.

An `advisorReportId` that exists but belongs to **another user** must be rejected, not silently used. Scope the lookup to `req.user.id` and return `404` when it doesn't resolve — the same rule every other endpoint in this repo follows, and the one place in this module where a cross-user leak could hand someone else's research report to your prompt.

Keep the controller thin: no prompt assembly, no Claude call.

**Test:** `apps/api/test/advisor.e2e-spec.ts` (extending the existing suite, Anthropic client stubbed): (1) no auth cookie → `401`; (2) authed with no body → `200` and a persisted analysis, since a report is optional context; (3) authed with a valid own `advisorReportId` → `200`, and the persisted row links to that report; (4) authed with another user's `advisorReportId` → `404`, and **no** analysis row is created; (5) authed with `advisorReportId: 'not-a-uuid'` → `400`, not `500`. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
