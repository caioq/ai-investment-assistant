import { test, expect, type Page } from '@playwright/test';
import { Client } from 'pg';
import { FIXTURE_USER } from './fixtures/fixture-user';
import { PRODUCT_NAME } from '../components/auth/auth-content';

/**
 * Browser-only acceptance criteria of the redesigned auth screen
 * (`AUTH_UI_SHARED_T-6`, spec: `specs/auth-ui/spec.md`): in-place mode
 * switching, a real sign-up round trip, the below-900px layout, and the
 * `prefers-reduced-motion` opt-outs. Everything else about `AuthScreen` is
 * covered by its jsdom unit tests — this spec only holds what a real browser
 * is required for (a real URL, a real cookie, real CSS media queries and
 * computed styles).
 *
 * Selector note (CONVENTIONS.md -> "Selecting the auth screen's fields"):
 * the mode toggle and the submit button share an accessible name in each
 * mode, so the submit button is always scoped to `page.locator('form')` and
 * the toggle to its `role="group"`. The password input needs
 * `{ exact: true }` so it doesn't also match the "Show password" toggle.
 */

// Same test-database URL as `global-setup.ts` and `playwright.config.ts`'s
// API `webServer` entry — db-test on 5433, never the dev database.
const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/investment_assistant_test?schema=public';

const API_URL = 'http://localhost:3001';

function modeToggle(page: Page) {
  return page.getByRole('group', { name: 'Sign in or create account' });
}

function submitButton(page: Page, name: 'Sign in' | 'Create account') {
  return page.locator('form').getByRole('button', { name, exact: true });
}

/**
 * Deletes a user this spec created, scoped to its own email — the same
 * plain-`pg` teardown `global-setup.ts` uses (there is no `DELETE /auth/me`
 * endpoint to call instead), and scoped per CONVENTIONS.md -> "Testing" so
 * it can never touch a row another suite owns.
 */
async function deleteUserByEmail(email: string): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('DELETE FROM users WHERE email = $1', [email]);
  } finally {
    await client.end();
  }
}

test('switching modes keeps the typed values and updates the URL in place', async ({ page }) => {
  await page.goto('/login');

  const email = 'mode-switch@example.com';
  const password = 'Abcdefgh1!';
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);

  // Segmented control -> Create account.
  await modeToggle(page).getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(password);

  // Switch line -> Sign in (a third "Sign in"-named control lives in the
  // toggle, hence the scope to the switch line's own paragraph).
  await page
    .locator('p', { hasText: 'Already have an account?' })
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(password);
});

test('creating an account lands on the dashboard and stores the name', async ({ page }) => {
  // Unique per run so a crashed earlier run can never collide with this one,
  // and namespaced so the teardown below is unambiguously scoped to this
  // spec's own row.
  const email = `e2e-auth-screen-signup-${Date.now()}@example.com`;

  try {
    await page.goto('/register');
    await page.getByLabel('Name').fill('E2E Person');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Abcdefgh1!');
    await submitButton(page, 'Create account').click();

    await expect(page).toHaveURL(/\/$/);

    // The session cookie is httpOnly, so this proves the browser really holds
    // it: `page.request` shares the page's cookie jar.
    const me = await page.request.get(`${API_URL}/auth/me`);
    expect(me.ok()).toBe(true);
    expect(await me.json()).toMatchObject({ email, name: 'E2E Person' });
  } finally {
    await deleteUserByEmail(email);
  }
});

test('at 390px the brand panel is hidden and the page does not scroll sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');

  await expect(page.getByTestId('brand-panel')).toBeHidden();
  await expect(page.getByTestId('auth-compact-brand').getByText(PRODUCT_NAME)).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test.describe('prefers-reduced-motion: reduce', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('the trust row\'s pulsing dot is static', async ({ page }) => {
    await page.goto('/login');

    const animationName = await page
      .getByTestId('trust-pulse-dot')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe('none');
  });

  test('the submit spinner does not rotate', async ({ page }) => {
    // The spinner only exists while a request is in flight, so `POST
    // /auth/login` is held open long enough to observe it. The real API still
    // answers (a 401 for this deliberately wrong password), so the response's
    // own CORS headers stay real rather than being faked by a `fulfill`.
    await page.route('**/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.continue();
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(FIXTURE_USER.email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password');
    await submitButton(page, 'Sign in').click();

    const spinner = page.getByTestId('button-spinner');
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('the submit button does not lift on hover', async ({ page }) => {
    await page.goto('/login');
    const submit = submitButton(page, 'Sign in');

    await submit.hover();
    expect(await submit.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test('without the reduced-motion preference the submit button does lift on hover', async ({
  page,
}) => {
  // The control for the test above: without it, a button that had lost its
  // hover lift entirely (or a broken selector) would still pass that
  // assertion, since `transform: none` is also the un-hovered value.
  await page.goto('/login');
  const submit = submitButton(page, 'Sign in');

  await submit.hover();
  await expect
    .poll(() => submit.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none');
});
