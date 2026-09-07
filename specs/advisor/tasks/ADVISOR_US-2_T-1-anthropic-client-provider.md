# ADVISOR_US-2_T-1: injectable Anthropic client

**Story:** [../stories/US-2-generate-analysis.md](../stories/US-2-generate-analysis.md)
**Status:** Done
**GitHub Issue:** #187 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_SHARED_T-2

Add `@anthropic-ai/sdk` as an `apps/api` dependency (it is **not** currently installed) and put the client behind a Nest DI token so every downstream test can inject a stub instead of calling the real API.

Follow the exact pattern `CONVENTIONS.md` → "Module structure" records for `PRICE_PROVIDER`: TypeScript interfaces don't survive to runtime, so export an explicit `export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT')` alongside a narrow interface describing only the call this module makes, bind the concrete client to that token in `AdvisorModule`, and have `AdvisorService` inject it via `@Inject(ANTHROPIC_CLIENT)`. Depending on the concrete SDK class instead would make the spec's "verify via a mocked client asserting call count" AC unexpressible without monkey-patching.

The API key comes from `process.env.ANTHROPIC_API_KEY` (already documented in `apps/api/.env`). Read it at provider construction and fail fast with a clear message if it's missing — note that `apps/api` has **no** `ConfigModule`/dotenv loader; env vars are read straight from `process.env` (see `auth.module.ts`'s `JWT_SECRET`), so a missing key surfaces at boot, not at the first request.

**Before writing any SDK call, load the `claude-api` skill** for the current TypeScript bindings. Do not infer method names, the structured-output parameter shape, or the thinking-config shape from memory or from another language's SDK — several of these changed during 2025–2026, and the spec's own note that the parameter is `output_config.format` (not the deprecated `output_format`) exists because of exactly that drift.

**Test:** `apps/api/src/advisor/advisor.module.spec.ts` — extend the isolated wiring spec from `ADVISOR_SHARED_T-2` to assert the module resolves the `ANTHROPIC_CLIENT` token, with `process.env.ANTHROPIC_API_KEY` set to a dummy value in the test. Add a case asserting that constructing the provider with the key **absent** throws a message naming `ANTHROPIC_API_KEY`, so a misconfigured deploy fails at boot with an obvious reason rather than at the first user click. No test in this repo may make a real network call to the Anthropic API. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
