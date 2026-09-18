# Dashboard UI — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-auth-pages.md) | Sign in, create an account, sign out | Done | T-1..T-4 in `../tasks/` |
| [US-2](./US-2-portfolio-header-summary.md) | See what my portfolio is worth | Done | T-1..T-3 in `../tasks/` |
| [US-3](./US-3-allocation-donuts.md) | See how my money is spread out | Ready | T-1..T-2 in `../tasks/` |
| [US-4](./US-4-performance-chart.md) | Track performance against a benchmark | Ready | T-1..T-4 in `../tasks/` |
| [US-5](./US-5-holdings-grid.md) | See every position I hold | Ready | T-1..T-3 in `../tasks/` |
| [US-6](./US-6-holdings-management.md) | Add holdings by hand or by CSV | Done | T-1..T-3 in `../tasks/` |
| [US-7](./US-7-advisor-panel.md) | Get the AI advisor's read on my portfolio | Ready | T-1..T-5 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/DASHBOARD_UI_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`DASHBOARD_UI_SHARED_T-1-api-client.md`](../tasks/DASHBOARD_UI_SHARED_T-1-api-client.md) — `lib/api-client.ts`: the one fetch wrapper, `credentials: 'include'`, `ApiError` with a status, `204` handling, and a multipart helper. Shared by every story.
- [`DASHBOARD_UI_SHARED_T-2-shared-types.md`](../tasks/DASHBOARD_UI_SHARED_T-2-shared-types.md) — `lib/types.ts` re-exporting `AllocationSlice`/`PortfolioValuePoint` from `packages/shared` and declaring the response shapes it doesn't own. Shared by US-2, US-3, US-4, US-5, US-7.
- [`DASHBOARD_UI_SHARED_T-3-design-tokens.md`](../tasks/DASHBOARD_UI_SHARED_T-3-design-tokens.md) — the mockup's palette as CSS custom properties, plus `Inter` via `next/font`. Shared by every story.
- [`DASHBOARD_UI_SHARED_T-4-ui-primitives.md`](../tasks/DASHBOARD_UI_SHARED_T-4-ui-primitives.md) — `Button`, `Card`, `Badge`. Shared by every story.
- [`DASHBOARD_UI_SHARED_T-5-dashboard-layout-guard.md`](../tasks/DASHBOARD_UI_SHARED_T-5-dashboard-layout-guard.md) — `(dashboard)/layout.tsx`: the auth guard (spec AC "unauthenticated visits redirect to `/login`") and the sidebar/main shell. Shared by US-2, US-3, US-4, US-5, US-6, US-7.
- [`DASHBOARD_UI_SHARED_T-6-dashboard-composition.md`](../tasks/DASHBOARD_UI_SHARED_T-6-dashboard-composition.md) — proves every section is actually mounted on the assembled page, including the all-empty new-user case, and is where a human confirms fidelity to the mockup. Shared by US-2, US-3, US-4, US-5, US-7.
- [`DASHBOARD_UI_SHARED_T-7-playwright-harness.md`](../tasks/DASHBOARD_UI_SHARED_T-7-playwright-harness.md) — the browser-e2e harness the repo documents but never had: config, dual `webServer`, a seeded fixture user, and the auth/logout smoke flow. Shared by every story.
- [`DASHBOARD_UI_SHARED_T-8-e2e-ci.md`](../tasks/DASHBOARD_UI_SHARED_T-8-e2e-ci.md) — runs that suite in CI, with artifacts on failure. Shared by every story.
- [`DASHBOARD_UI_SHARED_T-9-visual-regression.md`](../tasks/DASHBOARD_UI_SHARED_T-9-visual-regression.md) — the last task in the module: freezes the approved dashboard layout as a committed baseline so later drift fails a PR. Shared by US-2, US-3, US-4, US-5, US-7.

## Start here

**`SHARED_T-1`, `SHARED_T-2` and `SHARED_T-3` have no dependencies and can run in parallel** — three separate `/implement` calls on day one. `SHARED_T-4` follows `T-3`; `SHARED_T-5` follows `T-1` + `T-3`.

After those five, the module opens up wide: **US-1 (auth), and the leaf components of US-2, US-3, US-4, US-5, US-6 and US-7 are all independent of each other** and can be picked up simultaneously. This is the most parallelizable module in the repo — almost every task is one self-contained component with a colocated RTL test.

The exception, and the one real bottleneck: **`US-2_T-3` creates `(dashboard)/page.tsx`, and `US-3_T-2`, `US-4_T-4`, `US-5_T-3` and `US-7_T-5` all add their section to that same file.** Four stories are blocked on it, and then all four edit it. Merge `US-2_T-3` promptly rather than letting four branches stack on it, and expect the four wiring tasks to need rebasing against each other if they run truly concurrently. Build the leaf components in parallel; serialize the wiring.

`SHARED_T-6` depends on all four wiring tasks plus `US-2_T-3`, and `SHARED_T-9` depends on `T-6` — so the tail of the module is fixed: compose the page, have a human approve it against the mockup, then freeze that approval as a baseline.

The e2e harness is the one piece of infrastructure that can run early: **`SHARED_T-7` is unblocked as soon as `US-1_T-3` lands**, well before the dashboard exists, because its smoke flow is login/logout. Doing it early is worth it — it's the only test in the module that exercises a real cookie round trip through a real browser, and `SHARED_T-8` (CI) follows it immediately.

## Decisions this pass had to make

- **The daily change in the header has no backend field.** The spec's first Goal asks for "header (total value, daily change)", but `GET /portfolio/summary` returns only `{ totalInvested, currentValue, gainLoss, returnPct }`. Rather than block the module, `US-2_T-3` derives it from the last two points of `GET /portfolio/performance` — the page already fetches that endpoint, so it costs nothing. Two honest consequences are pinned in the tasks: a series with fewer than two points has *no* daily change (em-dash, never `0` — "flat" and "unknown" are different claims), and since snapshots are weekday-only the delta spans the weekend on a Monday, so the label reads "since last close" rather than "today". See "Flagged for you" — the clean fix is a portfolio-spec change, not a UI one.
- **Three mockup elements have no backend behind them and are omitted rather than faked**: "Cash available" (no cash concept anywhere in the data model), "Across 8 sectors" (not derivable from `/portfolio/summary` alone, and not worth a second request from a stat card), and the "S&P 500" benchmark legend (the backend's benchmarks are `IBOVESPA` and `CDI`). A hard-coded zero on the dashboard's most prominent row is worse than an absent card.
- **`(dashboard)/layout.tsx` holds the auth guard, not `middleware.ts`.** Middleware can see that a cookie exists but can't verify its signature without duplicating `JWT_SECRET` into the frontend runtime; a server-side `GET /auth/me` asks the service that actually knows. It also means an expired token behaves like no token — the case a "cookie present?" check silently gets wrong.
- **The server/client split is drawn at the smallest stateful leaf**, per `CONVENTIONS.md`. The page and every presentational component are Server Components fed by one concurrent `Promise.all`; only `PerformanceRange`, `AdvisorPanel` and the three forms are `'use client'`. That's what keeps the chart and the advisor report in the first paint instead of arriving after a client round trip.
- **Mockup fidelity is a human check; visual regression is a machine check; they are not the same thing.** The spec now says so in its Non-Goals. [`resources/UI/portfolio-dashboard.html`](../../../resources/UI/portfolio-dashboard.html) cannot be diffed against: it is a declarative prototype needing its own `support.js` runtime, with hardcoded demo data (Jordan, a cash balance, an S&P 500 benchmark) this UI deliberately omits, so every diff would fail by design. `SHARED_T-6` therefore ends in a human side-by-side read, and `SHARED_T-9` freezes *that approved result* as a baseline — catching future drift, not measuring design conformance.
- **The Playwright harness is scoped as module work, not a `project-setup` reopening.** `apps/web/e2e/` is this module's territory and the mockup AC is this module's AC; `project-setup` is fully `Done` and its bare task IDs (`US-1_T-1`) are a documented historical exception, so adding module-prefixed tasks there would mix two conventions in one directory. `SHARED_T-8` does edit `.github/workflows/ci.yml`, which `project-setup` owns — precedented by `ADVISOR_US-2_T-2` touching `recommended-portfolios`, and called out so a reviewer expects it.
- **Every component task's test includes its degenerate case, and they're not padding.** The empty-portfolio path runs through all of them at once on a new user's first load: `conic-gradient()` with zero stops is invalid CSS, an all-equal performance series divides by zero into a `NaN` path, a `null` `currentPrice` read as `0` reports a 100% loss, and a `404` from the advisor endpoint is the *expected* response. Each renders as a blank panel or a plausible-looking wrong number rather than an error, which is why they're asserted rather than eyeballed.

## Flagged for you, outside this pass's scope

- **`CONVENTIONS.md` → "Frontend → Testing" is currently false.** It states *"Playwright specs live under `apps/web/e2e/`"*; nothing was ever installed. `SHARED_T-7` is what makes the line true and should correct it in the same PR — until then, the file describes a harness that does not exist, which is exactly the kind of thing an `/implement` run reads as established fact.
- **`GET /portfolio/summary` should probably grow a `dayChange`/`dayChangePct`.** Deriving it in the frontend works and is what these tasks do, but the backend already holds the `PortfolioValueSnapshot` series and can compute it correctly once, including the weekday-only gap. Worth a `/spec portfolio` pass; nothing here forecloses it, and `PortfolioHeader` takes the values as props either way.
- **`GET /advisor/recommended-portfolios/latest` is read but never really displayed.** `US-7_T-2` shows which wallets are loaded and their `effectiveDate`, which is enough to decide whether to re-upload. The actual model-wallet holdings — and any side-by-side against the user's own positions — aren't in this spec's Goals, though they're arguably the most interesting thing the backend now holds.

## Out of scope for this pass

- **The mockup's dark/light theme toggle.** Not in the spec's Goals. `SHARED_T-3` defines only the light palette, structured so a `prefers-color-scheme` block could later override the same token names without touching a component.
- **Sidebar routes beyond Dashboard and Holdings.** The mockup shows Performance, AI Advisor and Settings; none are routes in this spec, and dead nav items are worse than absent ones.
- **Click-a-slice-to-filter-the-grid** (the mockup's allocation filter chip and its "No holdings match your filters" state) — not in the Goals. The grid takes its rows as a prop, so adding it later is a change to the page.
- **`by=investmentStyle` and `by=riskRating` donuts.** Supported by both the endpoint and `AllocationDonut`, but empty for any user who hasn't imported the assets CSV. The spec's "extensible to style/risk" is satisfied by the component's prop shape; mounting them is a two-line change later.
- **Editing and deleting holdings from the UI.** `PATCH`/`DELETE /portfolio/holdings/:id` exist, but this spec's holdings-page Goal is "manual add form + CSV upload".
- **Any backend change.** Every endpoint this module calls is already implemented and merged.
