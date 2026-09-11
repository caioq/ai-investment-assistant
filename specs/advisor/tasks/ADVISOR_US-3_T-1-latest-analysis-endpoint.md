# ADVISOR_US-3_T-1: GET /advisor/analysis/latest

**Story:** [../stories/US-3-latest-analysis.md](../stories/US-3-latest-analysis.md)
**Status:** Done
**GitHub Issue:** #191 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_US-2_T-3

Add `GET /advisor/analysis/latest`, returning the most recent `AdvisorAnalysis` for `req.user.id` or `404` when the user has never generated one.

The query is `findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })` — served by the `@@index([userId, createdAt])` from `ADVISOR_SHARED_T-1`. The `404` is deliberate rather than an empty `200`: it's what tells the dashboard to render the idle "Generate Portfolio Analysis" state instead of a blank panel.

**This endpoint must never call the Claude API.** That is the entire point of the story — the dashboard hits it on every page load, and a cache that regenerates on read would invert the spec's Goal of not spending money on a refresh. There is no TTL and no invalidation: `POST /advisor/analyze` appends, this reads the newest.

**Test:** `apps/api/test/advisor.e2e-spec.ts` (extending the existing suite, Anthropic client stubbed): (1) no auth cookie → `401`; (2) authed with no analyses → `404`; (3) after two analyses are generated, returns the **newer** one — seed the two with distinct `createdAt` values rather than relying on insertion order, since two rows created in the same millisecond make the assertion flaky; (4) **the count assertion that carries the story**: generate once, then call this endpoint twice, and assert the stubbed Anthropic client was called exactly once in total — the spec's "returns the same analysis without a new call to the Claude API" AC; (5) a second user with their own analysis never sees the first user's. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
