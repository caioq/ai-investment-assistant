import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { Client } from 'pg';

/**
 * Browser-only acceptance criteria of `/data-sources`
 * (`DATA_SOURCES_SHARED_T-10`, spec: `specs/data-sources/spec.md`). The
 * component logic is covered by jsdom unit tests; this spec holds what needs
 * real servers and a real browser: the auth redirect, the page being
 * *reachable* from the rail (twice in this module a panel was built but never
 * mounted), the `router.refresh()` path that feeds the known-ticker list,
 * persistence across a reload, and the reduced-motion opt-out.
 *
 * Fixtures and why each invalid row is invalid:
 * `./fixtures/data-sources/README.md`.
 *
 * Isolation: this suite registers its own user (unique per run) and namespaces
 * every asset ticker `E2EDS*` / `E2EZZ*`. `Asset` rows are global, so cleanup
 * deletes only those tickers, in FK order, never an unscoped delete.
 * Importing assets does not reach Yahoo Finance (`importAssetsCsv` never
 * backfills), so nothing here needs a network stub; no holdings are imported,
 * only attached (that would call Yahoo).
 */

const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/investment_assistant_test?schema=public';
const API_URL = 'http://localhost:3001';

const FIXTURES = path.resolve(__dirname, 'fixtures/data-sources');
const ASSETS_CSV = path.join(FIXTURES, 'assets-10-rows.csv');
const HOLDINGS_KNOWN_CSV = path.join(FIXTURES, 'holdings-known.csv');
const HOLDINGS_UNKNOWN_CSV = path.join(FIXTURES, 'holdings-unknown.csv');
const NOT_A_CSV = path.join(FIXTURES, 'not-a-csv.pdf');

const USER = {
  email: `e2e-data-sources-${Date.now()}@example.com`,
  password: 'Abcdefgh1!',
  name: 'E2E Data Sources',
};

async function withDb(fn: (client: Client) => Promise<void>): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

/** Removes only what this spec created, in FK order. */
async function cleanup(): Promise<void> {
  await withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      USER.email,
    ]);
    const userId = rows[0]?.id;
    if (userId) {
      await client.query('DELETE FROM import_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM holdings WHERE user_id = $1', [userId]);
    }
    const assetIds = `SELECT id FROM assets WHERE ticker LIKE 'E2EDS%' OR ticker LIKE 'E2EZZ%'`;
    await client.query(`DELETE FROM price_history WHERE asset_id IN (${assetIds})`);
    await client.query(`DELETE FROM holdings WHERE asset_id IN (${assetIds})`);
    await client.query(`DELETE FROM assets WHERE ticker LIKE 'E2EDS%' OR ticker LIKE 'E2EZZ%'`);
    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(USER.email);
  await page.getByLabel('Password', { exact: true }).fill(USER.password);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function openDataSourcesFromRail(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Data sources', exact: true }).click();
  await expect(page).toHaveURL(/\/data-sources$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Data sources' })).toBeVisible();
}

function card(page: Page, name: string) {
  return page.locator('button[aria-pressed]').filter({ hasText: name });
}

function fileInput(page: Page) {
  return page.locator('input[type="file"]');
}

test.describe.serial('/data-sources', () => {
  test.beforeAll(async () => {
    await cleanup();
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(USER),
    });
    if (!response.ok) {
      throw new Error(`register failed: ${response.status} ${await response.text()}`);
    }
  });

  test.afterAll(cleanup);

  test('signed out, /data-sources redirects to /login', async ({ page }) => {
    await page.goto('/data-sources');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('every source card mounts its panel', async ({ page }) => {
    await login(page);
    await openDataSourcesFromRail(page);

    await expect(page.getByRole('heading', { name: 'Import assets' })).toBeVisible();

    await card(page, 'Holdings').click();
    await expect(page.getByRole('heading', { name: 'Import holdings' })).toBeVisible();

    await card(page, 'Model wallets').click();
    await expect(page.getByRole('heading', { name: /^Import model wallet/ })).toBeVisible();

    await card(page, 'Research report').click();
    await expect(page.getByRole('heading', { name: 'Add research report' })).toBeVisible();
  });

  test('the rail marks Data sources as the current page', async ({ page }) => {
    await login(page);
    await openDataSourcesFromRail(page);

    const rail = page.getByRole('link', { name: 'Data sources', exact: true });
    await expect(rail).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('a PDF dropped on the assets zone attaches nothing', async ({ page }) => {
    await login(page);
    await openDataSourcesFromRail(page);

    await fileInput(page).setInputFiles(NOT_A_CSV);

    await expect(page.getByText('not-a-csv.pdf is not a CSV file.')).toBeVisible();
    await expect(page.getByTestId('summary-rows')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Drop the assets CSV here/ })).toBeVisible();
  });

  test('assets: attach, review, import, refresh known tickers, and survive a reload', async ({
    page,
  }) => {
    await login(page);
    await openDataSourcesFromRail(page);
    await expect(card(page, 'Assets')).toContainText('Never imported');

    // Before the import, every ticker is unknown to the asset master.
    await card(page, 'Holdings').click();
    await fileInput(page).setInputFiles(HOLDINGS_KNOWN_CSV);
    await expect(
      page.getByTestId('issue-item').filter({ hasText: 'E2EDS01 is not in the asset master' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Remove holdings-known.csv' }).click();

    await card(page, 'Assets').click();
    await fileInput(page).setInputFiles(ASSETS_CSV);

    await expect(page.getByTestId('summary-rows')).toContainText('10');
    await expect(page.getByTestId('summary-valid')).toContainText('8');
    await expect(page.getByTestId('summary-errors')).toContainText('2');
    await expect(page.getByTestId('issue-item')).toHaveCount(2);
    const importButton = page.getByRole('button', { name: 'Import 8 assets' });
    await expect(importButton).toBeEnabled();

    await importButton.click();

    await expect(page.getByRole('status').filter({ hasText: 'Imported 8 assets' })).toBeVisible();
    await expect(card(page, 'Assets')).toContainText(/· \d+ assets/);
    await expect(card(page, 'Assets')).not.toContainText('Never imported');
    await expect(
      page.getByRole('row').filter({ hasText: 'assets-10-rows.csv' }),
    ).toContainText('8 · 2 rejected');

    // The refresh path, no reload: the same holdings file no longer warns,
    // while a file with a still-unimported ticker does.
    await card(page, 'Holdings').click();
    await fileInput(page).setInputFiles(HOLDINGS_KNOWN_CSV);
    await expect(page.getByTestId('summary-rows')).toContainText('2');
    await expect(page.getByTestId('issue-item')).toHaveCount(0);
    await page.getByRole('button', { name: 'Remove holdings-known.csv' }).click();

    await fileInput(page).setInputFiles(HOLDINGS_UNKNOWN_CSV);
    await expect(
      page.getByTestId('issue-item').filter({ hasText: 'E2EZZ99 is not in the asset master' }),
    ).toBeVisible();
    await expect(
      page.getByTestId('issue-item').filter({ hasText: 'E2EDS01 is not in the asset master' }),
    ).toHaveCount(0);

    // Persistence.
    await page.reload();
    await expect(card(page, 'Assets')).toContainText(/· \d+ assets/);
    const reloadedRow = page.getByRole('row').filter({ hasText: 'assets-10-rows.csv' });
    await expect(reloadedRow).toHaveCount(1);
    await expect(reloadedRow).toContainText('8 · 2 rejected');

    await reloadedRow.getByRole('button', { name: /rejected rows from assets-10-rows.csv/ }).click();
    await expect(page.getByText(/row 4: /)).toBeVisible();
    await expect(page.getByText(/row 9: /)).toBeVisible();
  });

  test('reduced motion: the import spinner is static', async ({
    page,
  }) => {
    // Hold the upload open so the spinner exists, then abort it (a failed
    // import writes only a FAILED history row; nothing else is created).
    await page.route('**/market-data/assets/import', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.abort();
    });

    await login(page);
    await openDataSourcesFromRail(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fileInput(page).setInputFiles(ASSETS_CSV);
    await page.getByRole('button', { name: 'Import 8 assets' }).click();
    const spinner = page.getByTestId('button-spinner');
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('without reduced motion the import spinner does rotate (control)', async ({ page }) => {
    await page.route('**/market-data/assets/import', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.abort();
    });

    await login(page);
    await openDataSourcesFromRail(page);
    await fileInput(page).setInputFiles(ASSETS_CSV);
    await page.getByRole('button', { name: 'Import 8 assets' }).click();
    const spinner = page.getByTestId('button-spinner');
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
  });
});
