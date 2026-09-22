# AUTH_UI_SHARED_T-6: Playwright flows + `/login` and `/register` visual baselines

**Shared by:** US-1, US-2, US-3
**Status:** Not Started
**GitHub Issue:** #288 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-1_T-3, AUTH_UI_US-2_T-5, AUTH_UI_US-3_T-2, AUTH_UI_SHARED_T-3, AUTH_UI_SHARED_T-4

Add `apps/web/e2e/auth-screen.spec.ts` covering the browser-only acceptance criteria. Add visual baselines for both routes in `apps/web/e2e/auth-visual.spec.ts`, using the same approach as `dashboard-visual.spec.ts`. Linux Chromium baselines are generated in CI, as dashboard-ui SHARED_T-9 did.

**Test:** `apps/web/e2e/auth-screen.spec.ts`:
1. **Mode switching.** On `/login`, type an email and a password, then click the segmented control's "Create account". The URL ends in `/register`, both fields keep their values, and the Name field is visible. Click "Sign in" in the switch line: the URL ends in `/login` and the values are still kept.
2. **Sign up.** On `/register`, fill a unique email, a name of `E2E Person` and the password `Abcdefgh1!`, then submit. The page lands on `/`, and `GET /auth/me` returns `name: "E2E Person"`. Afterwards, clean up that user with a scoped `pg` delete, as `global-setup.ts` does.
3. **Narrow viewport.** At 390×844, the brand panel is hidden, `PRODUCT_NAME` is visible, and `document.documentElement.scrollWidth <= 390`.
4. **Reduced motion.** With `page.emulateMedia({ reducedMotion: 'reduce' })`:
   - the computed `animation-name` of the trust row's pulsing dot is `none`
   - the loading spinner's computed `animation-name` is `none`; to see the spinner, route `POST /auth/login` to a delayed response and click Sign in
   - hovering the submit button leaves its computed `transform` at `none`

`auth-visual.spec.ts` covers `/login` and `/register` with `toHaveScreenshot`, with animations disabled.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes. The whole `pnpm --filter web test:e2e` suite must pass in CI with the new baselines committed.
