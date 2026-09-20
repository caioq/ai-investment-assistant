import { test, expect } from '@playwright/test';
import { FIXTURE_USER } from './fixtures/fixture-user';

// The only end-to-end proof of the auth-guard and logout acceptance
// criteria (see specs/dashboard-ui/spec.md) — every other test of them
// mocks `next/headers`, so this is the sole spec that exercises a real
// cookie round trip through a real browser against real servers.
test('unauthenticated dashboard visit redirects to login, login lands on the dashboard, logout redirects back and locks the dashboard again', async ({
  page,
}) => {
  // Unauthenticated visit to a (dashboard) route redirects to /login.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  // Log in as the fixture user registered by global setup.
  await page.getByLabel('Email').fill(FIXTURE_USER.email);
  await page.getByLabel('Password').fill(FIXTURE_USER.password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // Lands on the dashboard.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  // Log out.
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // A direct dashboard visit after logout redirects to /login again,
  // proving the cookie was actually cleared server-side rather than the
  // client just navigating away from a still-valid session.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});
