# DASHBOARD_UI_SHARED_T-5: `(dashboard)/layout.tsx` shell + auth guard

**Shared by:** US-2, US-3, US-4, US-5, US-6, US-7
**Status:** Not Started
**GitHub Issue:** #207 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-3

Create `apps/web/app/(dashboard)/layout.tsx` — a **Server Component** that guards every route in the group and renders the app shell.

- Guard: read the `access_token` cookie via `next/headers`' `cookies()` and call `GET /auth/me` through the api client, forwarding the cookie header. Any failure — missing cookie, `401`, expired token — `redirect('/login')` from `next/navigation`. This is the spec AC "Unauthenticated visits to any `(dashboard)` route redirect to `/login`", and it lives in the layout so a new page added to the group is protected by existing there, not by remembering to add a check.
- Shell: the mockup's two-column grid (`grid-template-columns: 80px 1fr`, areas `"sidebar main"`, `min-height: 100vh`), with the icon sidebar and a scrollable `<main>`.
- Sidebar nav: link **Dashboard** (`/`) and **Holdings** (`/holdings`) only. The mockup also shows Performance, AI Advisor and Settings; those are not routes in this spec, and rendering dead nav items that go nowhere is worse than omitting them.
- Pass the resolved user down so `US-2`'s header can greet by name without a second `GET /auth/me`.

Do **not** put the guard in `middleware.ts`. Middleware can see the cookie exists but can't verify the signature without duplicating the JWT secret into the frontend's runtime; a server-side `GET /auth/me` asks the one service that actually knows.

**Test:** `apps/web/app/(dashboard)/layout.test.tsx` (Vitest + RTL, with `next/headers`, `next/navigation` and the api client mocked): (1) with no `access_token` cookie, rendering the layout calls `redirect('/login')` and renders no children; (2) with a cookie whose `GET /auth/me` resolves, children render and the sidebar contains links to `/` and `/holdings`; (3) with a cookie whose `GET /auth/me` rejects with a `401` `ApiError`, `redirect('/login')` is called — an expired token must behave like no token, which is the case a "cookie present?" check silently gets wrong.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
