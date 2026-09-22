# AUTH_UI_US-1_T-3: Serve `/login` from `AuthScreen` and retire `LoginForm`

**Story:** [../stories/US-1-sign-in.md](../stories/US-1-sign-in.md)
**Status:** Done
**GitHub Issue:** #280 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-1_T-2

Change `apps/web/app/(auth)/login/page.tsx` so it still calls `await redirectIfAuthenticated()` first and then renders only `<AuthScreen startMode="signin" />`. It no longer renders its own `<h1>Log in</h1>` or register link.

Clean up and update everything that depended on the old form:
- **Delete:** `apps/web/components/auth/LoginForm.tsx` and `LoginForm.test.tsx`.
- **Update Playwright selectors** in `apps/web/e2e/auth.spec.ts` and `apps/web/e2e/dashboard-visual.spec.ts` (lines 22–25):
  - `getByRole('button', { name: 'Log in' })` → `getByRole('button', { name: 'Sign in', exact: true })`
  - `getByLabel('Password')` → `getByLabel('Password', { exact: true })`
- **Rewrite CONVENTIONS.md → "Auth forms"** so its `LoginForm` paragraph describes `AuthScreen`'s error mapping (401 / 429 / other).

**Test:** `apps/web/app/(auth)/login/page.test.tsx` (update the existing file):
1. With `redirectIfAuthenticated` mocked to resolve, the page renders the "Welcome back" heading, from `AuthScreen` in Sign in mode.
2. With it mocked to throw Next's redirect error, the page does not render the form.

Also, `apps/web/e2e/auth.spec.ts` passes unchanged in behaviour: `/` redirects to `/login`, sign in with the fixture user lands on `/`, and logout returns to `/login`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
