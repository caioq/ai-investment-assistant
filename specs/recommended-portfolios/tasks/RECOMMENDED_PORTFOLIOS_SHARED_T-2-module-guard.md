# RECOMMENDED_PORTFOLIOS_SHARED_T-2: module + guarded controller wiring

**Shared by:** US-1, US-2
**Status:** Not Started
**GitHub Issue:** #132 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create the module skeleton at `apps/api/src/recommended-portfolios/` per `CONVENTIONS.md` → "Module structure": `recommended-portfolios.module.ts`, `recommended-portfolios.service.ts` (injecting `PrismaService` via constructor DI), and `recommended-portfolios.controller.ts`. Register the module in `apps/api/src/app.module.ts`.

**The controller's route prefix is `advisor/recommended-portfolios`**, not `recommended-portfolios` — that's what the spec's API Contract specifies (`POST /advisor/recommended-portfolios/upload`, `GET /advisor/recommended-portfolios/latest`). The mismatch with the module directory name is intentional: these endpoints sit on the advisor surface the frontend talks to, while the code lives in its own module because it owns its own models. Don't "fix" the prefix to match the folder.

Apply the shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) **at the controller class**, not per-handler, per `CONVENTIONS.md` → "Auth". Every row this module writes carries a `userId`, which always comes from `req.user.id` and never from the request — guarding the class means a handler added later is protected by default rather than by remembering.

No endpoints are added here; each story's tasks add their own.

**Test:** `apps/api/src/recommended-portfolios/recommended-portfolios.module.spec.ts` — a DI-wiring test following `MARKET_DATA_SHARED_T-2` and `PORTFOLIO_SHARED_T-2`: `Test.createTestingModule({ imports: [RecommendedPortfoliosModule, PrismaModule] }).overrideProvider(PrismaService).useValue({} as PrismaService).compile()`, then assert `module.get(RecommendedPortfoliosService)` and `module.get(RecommendedPortfoliosController)` both resolve.

The explicit `PrismaModule` import and override are required rather than incidental — `CONVENTIONS.md` → "Testing" records that `@Global()` only reaches modules already in the compiled graph, so a feature module compiled alone never pulls `PrismaModule` in, and `overrideProvider` only works on a provider already present. Omitting either makes this fail for a reason unrelated to the code under test.

Confirm red first (no `RecommendedPortfoliosModule` exists, so the import fails to resolve), then green.

**Done when:** the test above passes, and `AuthGuard` is applied once at the controller class.
