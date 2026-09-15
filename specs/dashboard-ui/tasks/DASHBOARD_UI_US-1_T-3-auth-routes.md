# DASHBOARD_UI_US-1_T-3: `(auth)` routes

**Story:** [../stories/US-1-auth-pages.md](../stories/US-1-auth-pages.md)
**Status:** Not Started
**GitHub Issue:** #211 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-1_T-1, DASHBOARD_UI_US-1_T-2

Add `apps/web/app/(auth)/login/page.tsx` and `apps/web/app/(auth)/register/page.tsx`, plus an `(auth)/layout.tsx` giving both the centered single-column shell (the dashboard's sidebar grid has no place on a login screen).

Each page is a Server Component that renders its form and cross-links to the other route. Both **redirect to `/` when the visitor is already authenticated** — same `cookies()` + `GET /auth/me` probe as `SHARED_T-5`, inverted. Without it, a logged-in user following a stale `/login` bookmark gets a form that logs them into the session they already have.

Also replace the Next.js starter content in `apps/web/app/page.tsx`: it currently renders the placeholder from `US-3_T-2-placeholder-page` and lives at the route the dashboard group will own.

**Test:** `apps/web/app/(auth)/login/page.test.tsx` (Vitest + RTL, `next/headers`/`next/navigation`/api client mocked): (1) an unauthenticated visit renders the login form and a link to `/register`; (2) a visit whose `GET /auth/me` resolves calls `redirect('/')`. Mirror both for `register/page.test.tsx` with the link pointing at `/login`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
