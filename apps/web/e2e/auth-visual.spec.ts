import { test, expect } from '@playwright/test';

/**
 * Visual-regression baselines for the auth screen's two modes
 * (`AUTH_UI_SHARED_T-6`), following `dashboard-visual.spec.ts`'s approach:
 * each route is compared against **its own committed baseline**, never
 * against a design mockup — see that spec's doc comment and
 * `apps/web/e2e/README.md` for the full rationale.
 *
 * Both routes are static, unauthenticated and seed-free, so no fixture user
 * or `pg` seed is involved; the only non-determinism worth waiting on is
 * webfont loading (Fraunces, loaded by `app/(auth)/layout.tsx` via
 * `next/font/google`), hence the `document.fonts.ready` wait. Animations are
 * disabled for every screenshot by `playwright.config.ts`'s
 * `expect.toHaveScreenshot` option.
 *
 * Baselines are platform-specific (Linux/Chromium, generated in CI — see
 * `apps/web/e2e/README.md`). A baseline generated natively on a macOS laptop
 * will fail on every CI run with a diff no human can see.
 */

test('sign-in screen matches its committed baseline', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot('auth-login.png', { fullPage: true });
});

test('create-account screen matches its committed baseline', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your account', level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot('auth-register.png', { fullPage: true });
});
