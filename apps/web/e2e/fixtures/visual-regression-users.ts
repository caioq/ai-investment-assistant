/**
 * The two fixture users `dashboard-visual.spec.ts` logs in as, deliberately
 * separate from `FIXTURE_USER` (`./fixture-user.ts`) — seeding a portfolio
 * for that user would change what `auth.spec.ts` renders/asserts on the
 * dashboard, and reusing/mutating one user across the populated and empty
 * screenshots would make the two assertions order-dependent within a single
 * run. Both are registered by `e2e/global-setup.ts` through the same real
 * `POST /auth/register` pattern as `FIXTURE_USER`; only `POPULATED`'s
 * holdings/snapshots/advisor analysis are then written directly via `pg`
 * (see `./visual-regression-seed.ts`) rather than through the live API.
 * Namespaced (`e2e-visual-` prefix) so they can never collide with
 * `FIXTURE_USER` or with `apps/api`'s own `*.e2e-spec.ts` fixtures, which
 * run against the same `db-test` instance (CONVENTIONS.md -> "Testing").
 */
export const VISUAL_REGRESSION_POPULATED_USER = {
  email: 'e2e-visual-populated@example.com',
  password: 'super-secret-e2e-password',
  name: 'Visual Regression Populated User',
};

/**
 * Registered fresh, never seeded — the empty-portfolio screenshot is just
 * this user's dashboard immediately after registration. A dedicated user
 * (rather than reusing `VISUAL_REGRESSION_POPULATED_USER` before its seed
 * step runs) so the populated and empty screenshots never depend on test
 * ordering or timing within the same suite run.
 */
export const VISUAL_REGRESSION_EMPTY_USER = {
  email: 'e2e-visual-empty@example.com',
  password: 'super-secret-e2e-password',
  name: 'Visual Regression Empty User',
};
