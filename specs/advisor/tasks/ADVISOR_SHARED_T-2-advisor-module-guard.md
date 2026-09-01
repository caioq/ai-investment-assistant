# ADVISOR_SHARED_T-2: AdvisorModule wiring with AuthGuard

**Shared by:** US-1, US-2, US-3
**Status:** Not Started
**GitHub Issue:** #184 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_SHARED_T-1

Add `apps/api/src/advisor/` with `advisor.module.ts`, `advisor.service.ts` and `advisor.controller.ts`, registered in `AppModule`, following `CONVENTIONS.md` → "Module structure" (thin controller, logic in the service, `PrismaService` injected from the global `PrismaModule`).

Apply the shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) at the controller, as `market-data` and `portfolio` both do. Every route in this module is per-user and one of them spends money on a paid API — an unauthenticated `POST /advisor/analyze` would be a way for anyone to run up the bill.

`AdvisorModule` imports `PortfolioModule` and `RecommendedPortfoliosModule` for their exported services (`PortfolioService`, `RecommendedPortfoliosService` — both already in their modules' `exports`), which `ADVISOR_US-2_T-2` uses to gather prompt input. Advisor reads those modules **through their services, never by querying their tables directly** — the same one-way boundary rule `market-data`'s spec states, applied here in the direction advisor → portfolio/recommended-portfolios.

**Test:** `apps/api/src/advisor/advisor.module.spec.ts` — an isolated DI-wiring spec compiling `AdvisorModule` alone. Per `CONVENTIONS.md` → "Testing", a module compiled in isolation does **not** get `@Global()` `PrismaModule` for free: import `PrismaModule` explicitly in the test's `imports` and `.overrideProvider(PrismaService).useValue({} as PrismaService)` before `.compile()`. Asserts the module compiles and resolves `AdvisorService`. Plus `apps/api/test/advisor.e2e-spec.ts` asserting an unauthenticated request to one of the module's routes returns `401` rather than `404`, proving the guard is mounted. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
