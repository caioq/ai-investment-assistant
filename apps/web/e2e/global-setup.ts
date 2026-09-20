import { Client } from 'pg';
import { FIXTURE_USER } from './fixtures/fixture-user';

const API_URL = 'http://localhost:3001';

// Same test-database URL as playwright.config.ts's API `webServer` entry —
// db-test, port 5433, never the dev database (CONVENTIONS.md -> "Local
// Postgres").
const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/investment_assistant_test?schema=public';

/**
 * Deletes any pre-existing fixture user (and its dependent rows, in FK
 * order — same lesson as `apps/api/test/auth.e2e-spec.ts`'s teardown, see
 * the `User` model's relations in `apps/api/prisma/schema.prisma`) so
 * repeated local runs of this suite are idempotent, then registers it
 * fresh through a real `POST /auth/register` call. Deliberately not
 * written to the database directly for the registration itself — using
 * the real HTTP endpoint keeps this harness ignorant of Prisma and
 * exercises the exact path a real user takes, per the task's own
 * instruction. Direct SQL (a plain `pg` client, not the generated Prisma
 * client — this harness intentionally stays outside `apps/api`'s Prisma
 * setup) is used only for the teardown step, since there's no `DELETE
 * /auth/me` endpoint to call instead.
 *
 * Playwright starts every configured `webServer` entry (and waits for its
 * `url` healthcheck) before running `globalSetup`, so the API server this
 * function calls below is guaranteed to already be up.
 */
export default async function globalSetup(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [FIXTURE_USER.email],
    );
    const existingUserId = rows[0]?.id;

    if (existingUserId) {
      await client.query('DELETE FROM advisor_analyses WHERE user_id = $1', [existingUserId]);
      await client.query('DELETE FROM advisor_reports WHERE user_id = $1', [existingUserId]);
      await client.query('DELETE FROM portfolio_value_snapshots WHERE user_id = $1', [
        existingUserId,
      ]);
      await client.query('DELETE FROM holdings WHERE user_id = $1', [existingUserId]);
      await client.query('DELETE FROM recommended_portfolios WHERE user_id = $1', [
        existingUserId,
      ]);
      await client.query('DELETE FROM users WHERE id = $1', [existingUserId]);
    }
  } finally {
    await client.end();
  }

  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(FIXTURE_USER),
  });

  if (!response.ok) {
    throw new Error(
      `global setup: POST /auth/register for the fixture user failed with ${response.status}: ${await response.text()}`,
    );
  }
}
