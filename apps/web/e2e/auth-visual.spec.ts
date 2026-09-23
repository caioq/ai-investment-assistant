import { test, expect, type Page } from '@playwright/test';

/**
 * Visual-regression baselines for the auth screen's two modes
 * (`AUTH_UI_SHARED_T-6`), following `dashboard-visual.spec.ts`'s approach:
 * each route is compared against **its own committed baseline**, never
 * against a design mockup — see that spec's doc comment and
 * `apps/web/e2e/README.md` for the full rationale.
 *
 * Both routes are static, unauthenticated and seed-free, so none of
 * `dashboard-visual.spec.ts`'s `pg` seeding or `mask:`ing is needed here.
 * The one thing that is: **Fraunces**. `app/(auth)/layout.tsx` loads it
 * through `next/font/google`, and a frame captured before the face is
 * applied renders the headline and form title in the fallback serif —
 * roughly a 3,000-pixel diff, and one that alternated frame-to-frame in CI
 * against a warm `next dev` server (confirmed: `3055 -> 115 -> 3162`
 * pixels within a single assertion's own retry loop). `document.fonts.ready`
 * alone was not enough, hence the explicit per-face `document.fonts.check`
 * wait below plus a `networkidle` wait, and a longer-than-default assertion
 * timeout so the comparison's internal retry loop can outlast a cold
 * dev-server compile of the route.
 *
 * Baselines are platform-specific (Linux/Chromium, generated in CI — see
 * `apps/web/e2e/README.md`). A baseline generated natively on a macOS
 * laptop will fail on every CI run with a diff no human can see.
 */

/** The two Fraunces faces the auth screen actually uses (weights 500/600). */
async function waitForAuthScreenToSettle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.fonts.check('500 27px Fraunces') && document.fonts.check('600 18px Fraunces'),
  );
}

const SCREENSHOT_OPTIONS = { fullPage: true, timeout: 20_000 } as const;

test('sign-in screen matches its committed baseline', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();
  await waitForAuthScreenToSettle(page);

  await expect(page).toHaveScreenshot('auth-login.png', SCREENSHOT_OPTIONS);
});

test('create-account screen matches its committed baseline', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your account', level: 1 })).toBeVisible();
  await waitForAuthScreenToSettle(page);

  await expect(page).toHaveScreenshot('auth-register.png', SCREENSHOT_OPTIONS);
});
