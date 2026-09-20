/**
 * The one fixture user this Playwright suite logs in as. Registered by
 * `e2e/global-setup.ts` through a real `POST /auth/register` call against
 * the API server booted for this suite (pointed at `db-test`, never the
 * dev database — see `playwright.config.ts`). Namespaced (`e2e-` prefix)
 * so it can never collide with a fixture used by `apps/api`'s own
 * `*.e2e-spec.ts` suites, which run against the same `db-test` instance
 * (CONVENTIONS.md -> "Testing").
 */
export const FIXTURE_USER = {
  email: 'e2e-fixture-user@example.com',
  password: 'super-secret-e2e-password',
  name: 'E2E Fixture User',
};
