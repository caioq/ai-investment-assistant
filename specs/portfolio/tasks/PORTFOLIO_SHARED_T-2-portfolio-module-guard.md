# PORTFOLIO_SHARED_T-2: PortfolioModule + guarded controller wiring

**Shared by:** US-1, US-2, US-3, US-4, US-5
**Status:** Not Started
**GitHub Issue:** #97 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create the module skeleton at `apps/api/src/portfolio/` per `CONVENTIONS.md` → "Module structure": `portfolio.module.ts`, `portfolio.service.ts` (injecting `PrismaService` via constructor DI), and `portfolio.controller.ts` with the route prefix `portfolio`. Register `PortfolioModule` in `apps/api/src/app.module.ts`.

Apply the shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`, from `AUTH_US-3_T-1`) **at the controller level** with `@UseGuards(AuthGuard)`, not per-handler. Every endpoint this module adds is scoped to `req.user.id` — per `CONVENTIONS.md` → "Auth" and the spec's API Contract preamble ("All endpoints scoped to `req.user.id`; no `portfolioId`/`userId` accepted from the client") — so guarding the class means a handler added later is protected by default. Per-handler decoration makes an unguarded endpoint a silent omission rather than a deliberate act, which is exactly the failure `PORTFOLIO_US-1_T-5` exists to catch.

No endpoints are added here; each story's tasks add their own.

**Test:** `apps/api/src/portfolio/portfolio.module.spec.ts` — a DI-wiring test following `MARKET_DATA_SHARED_T-2`'s precedent: `Test.createTestingModule({ imports: [PortfolioModule, PrismaModule] }).overrideProvider(PrismaService).useValue({} as PrismaService).compile()`, then assert `module.get(PortfolioService)` and `module.get(PortfolioController)` both resolve.

The explicit `PrismaModule` import and override are required, not incidental — `CONVENTIONS.md` → "Testing" records that `@Global()` only reaches modules already in the compiled graph, so a feature module compiled alone never pulls `PrismaModule` in, and `overrideProvider` only works on a provider already present. Omitting either makes this test fail for a reason that has nothing to do with the code under test.

Confirm red first (no `PortfolioModule` exists, so the import fails to resolve), then green.

**Done when:** the test above passes, and `AuthGuard` is applied once at the controller class.
