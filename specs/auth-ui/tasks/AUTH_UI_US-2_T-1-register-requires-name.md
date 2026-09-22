# AUTH_UI_US-2_T-1: Require a trimmed `name` on `POST /auth/register`

**Story:** [../stories/US-2-create-account.md](../stories/US-2-create-account.md)
**Status:** Done
**GitHub Issue:** #281 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

In `apps/api/src/auth/dto/register.dto.ts`, make `name` required:
- remove `@IsOptional`
- add a `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`
- add `@IsString()` + `@IsNotEmpty()`

A missing or whitespace-only name therefore fails the global `ValidationPipe` with `400`, and the stored `User.name` is the trimmed value. `User.name` stays nullable in `schema.prisma`, so no migration is needed (see [auth spec](../../auth/spec.md) → "Amended by auth-ui").

**This breaks every caller that registers without a name**, so update them in the same change, each sending a suite-specific name:
- `apps/api/test/auth.e2e-spec.ts`
- `apps/api/test/portfolio.e2e-spec.ts`
- `apps/api/test/advisor.e2e-spec.ts`
- `apps/api/test/market-data.e2e-spec.ts`
- `apps/api/test/market-data-assets-import.e2e-spec.ts`
- `apps/api/test/recommended-portfolios.e2e-spec.ts`
- `apps/web/e2e/global-setup.ts`
- `apps/web/e2e/fixtures/fixture-user.ts`
- `apps/web/e2e/fixtures/visual-regression-users.ts`

`RegisterForm` is replaced in AUTH_UI_US-2_T-5 and already sends a name when one is typed.

**Test:** `apps/api/test/auth.e2e-spec.ts` (extend; real `AppModule` + `configureApp`):
1. `POST /auth/register` without `name` returns `400` and creates no `users` row for that email.
2. `name: "   "` returns `400`.
3. `name: "  Ana  "` returns `201` with `name: "Ana"`, and `GET /auth/me` with the returned cookie also returns `"Ana"`.

The full `pnpm --filter api test:e2e` must still pass after the caller updates.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
