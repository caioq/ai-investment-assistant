import { Client } from 'pg';
import { FIXTURE_USER } from './fixtures/fixture-user';
import {
  VISUAL_REGRESSION_EMPTY_USER,
  VISUAL_REGRESSION_POPULATED_USER,
} from './fixtures/visual-regression-users';
import {
  cleanupVisualRegressionFixtures,
  seedVisualRegressionPopulatedUser,
} from './fixtures/visual-regression-seed';

const API_URL = 'http://localhost:3001';

// Same test-database URL as playwright.config.ts's API `webServer` entry —
// db-test, port 5433, never the dev database (CONVENTIONS.md -> "Local
// Postgres").
const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/investment_assistant_test?schema=public';

interface RegisterableUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Registers one fixture user through a real `POST /auth/register` call.
 * Deliberately not written to the database directly for the registration
 * itself — using the real HTTP endpoint keeps this harness ignorant of
 * Prisma and exercises the exact path a real user takes, per the task's own
 * instruction. Direct SQL (a plain `pg` client, not the generated Prisma
 * client — this harness intentionally stays outside `apps/api`'s Prisma
 * setup) is used only for teardown/seeding, since there's no `DELETE
 * /auth/me` endpoint to call instead.
 */
async function registerUser(user: RegisterableUser): Promise<void> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error(
      `global setup: POST /auth/register for ${user.email} failed with ${response.status}: ${await response.text()}`,
    );
  }
}

/**
 * Deletes any pre-existing fixture user (and its dependent rows, in FK
 * order — same lesson as `apps/api/test/auth.e2e-spec.ts`'s teardown, see
 * the `User` model's relations in `apps/api/prisma/schema.prisma`) so
 * repeated local runs of this suite are idempotent, then registers
 * `FIXTURE_USER` (used by `auth.spec.ts`) and the two visual-regression
 * fixture users (`DASHBOARD_UI_SHARED_T-9`, used by
 * `dashboard-visual.spec.ts`) fresh, seeding the latter's "populated"
 * dashboard state directly via `pg` — see
 * `./fixtures/visual-regression-seed.ts` for why that seed bypasses the
 * live API.
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

    await cleanupVisualRegressionFixtures(client, [
      VISUAL_REGRESSION_POPULATED_USER.email,
      VISUAL_REGRESSION_EMPTY_USER.email,
    ]);
  } finally {
    await client.end();
  }

  await registerUser(FIXTURE_USER);
  await registerUser(VISUAL_REGRESSION_POPULATED_USER);
  await registerUser(VISUAL_REGRESSION_EMPTY_USER);

  // Seeded after registration, since the populated user's `id` (assigned by
  // `POST /auth/register`) is a foreign key on every row this seed writes.
  const seedClient = new Client({ connectionString: TEST_DATABASE_URL });
  await seedClient.connect();
  try {
    const { rows } = await seedClient.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [VISUAL_REGRESSION_POPULATED_USER.email],
    );
    const populatedUserId = rows[0]?.id;
    if (!populatedUserId) {
      throw new Error(
        `global setup: expected ${VISUAL_REGRESSION_POPULATED_USER.email} to exist right after registration, but it wasn't found.`,
      );
    }
    await seedVisualRegressionPopulatedUser(seedClient, populatedUserId);
  } finally {
    await seedClient.end();
  }
}
