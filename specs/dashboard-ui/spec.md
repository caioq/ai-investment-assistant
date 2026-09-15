# Dashboard UI

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [auth](../auth/spec.md), [portfolio](../portfolio/spec.md), [advisor](../advisor/spec.md)

## Problem

All the backend modules need one coherent screen where the user can see their portfolio and trigger the AI Advisor. [resources/UI/portfolio-dashboard.html](../../resources/UI/portfolio-dashboard.html) is an existing static mockup (a declarative prototype, not production code) that already defines the target UX and should be used as the visual reference.

## Goals

- Single dashboard page showing: header (total value, daily change), two allocation donuts (by sector, by stock — extensible to style/risk), a performance line chart with benchmark overlay and range toggle, a holdings grid, summary cards, and the AI Advisor panel.
- Holdings management page: manual add form + CSV upload.
- Auth pages: login, register, and a logout control in the dashboard shell.

## Non-Goals

- Any chart/data library beyond what's needed to replicate the mockup — the donut is CSS `conic-gradient`, the line chart is hand-rolled SVG mirroring the mockup's technique. No new charting dependency in v1. This rules out *runtime* dependencies only; the browser-e2e and visual-regression harness below is a devDependency and is in scope.
- **Pixel-diffing the rendered app against the mockup.** [resources/UI/portfolio-dashboard.html](../../resources/UI/portfolio-dashboard.html) is a declarative prototype, not a static page: it needs its own `support.js` runtime to render, and its data is hardcoded demo content (a user named Jordan, a cash balance, an S&P 500 benchmark) that this UI deliberately does not reproduce. A diff against it would fail by design on every one of those. Visual regression here means comparing the app against its own committed baselines.
- Portfolio switching UI — there is exactly one portfolio per user (see [portfolio](../portfolio/spec.md)).

## Data Model

None — this is a frontend-only spec, consuming the APIs defined in the specs it depends on.

## API Contract

None — see [auth](../auth/spec.md), [portfolio](../portfolio/spec.md), [advisor](../advisor/spec.md), and [recommended-portfolios](../recommended-portfolios/spec.md) for the endpoints this UI calls.

## Behavior Notes

Structure (`apps/web/`, Next.js App Router):

```
app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (dashboard)/layout.tsx           # auth guard, server component reading the cookie; hosts LogoutButton
  (dashboard)/page.tsx              # main dashboard
  (dashboard)/holdings/page.tsx     # manual add + CSV upload
components/
  dashboard/
    PortfolioHeader.tsx
    AllocationDonut.tsx             # reusable: {title, slices:[{label,value,color}], centerLabel, centerSubLabel}
    PerformanceChart.tsx            # line + area fill, 6M/1Y/ALL toggle, benchmark overlay
    PerformanceMetrics.tsx          # CAGR, volatility, drawdown, vs. Ibovespa/CDI
    HoldingsGrid.tsx / HoldingCard.tsx
    SummaryCards.tsx
    advisor/
      AdvisorPanel.tsx               # orchestrates idle/loading/report states
      AdvisorReportUpload.tsx        # PDF upload or pasted text
      RecommendedPortfoliosUpload.tsx # CSV upload per wallet (Dividends/Overall/Small Caps)
      AdvisorAnalysisResult.tsx      # score ring + 3 columns + impact metrics
  auth/LoginForm.tsx, RegisterForm.tsx, LogoutButton.tsx
  ui/ (Button, Card, Badge)
lib/
  api-client.ts   # fetch wrapper, credentials: 'include'
  types.ts        # re-exports from packages/shared
e2e/              # Playwright specs, one per critical user flow
```

- `AllocationDonut` is the main reuse point: same component serves sector, stock, and (once populated) investment-style/risk-rating breakdowns, and later asset-class breakdown when fixed income/crypto exist — only the `slices` prop changes.
- `AdvisorPanel` state machine: `idle` → (click "Generate Portfolio Analysis") → `loading` → `report` (or `error`). "Ask Another Question" resets to `idle` without deleting the persisted analysis.
- Dashboard page loads `GET /advisor/analysis/latest` on mount to show a previously generated report without spending API budget.
- `LogoutButton` lives in the `(dashboard)` shell's sidebar, so it is reachable from every authenticated route and from nowhere else. It calls `POST /auth/logout` (which returns `204` and clears the httpOnly cookie server-side) and then navigates to `/login`. The client cannot clear the cookie itself — it is `httpOnly` by design — so a client-side redirect without the request is not a logout.

### Testing

- Component behaviour is covered by Vitest + React Testing Library, colocated per `CONVENTIONS.md`.
- **Browser end-to-end and visual regression run on Playwright**, specs under `apps/web/e2e/`, one per critical user flow rather than one per page. This harness does not exist in the repo yet: `CONVENTIONS.md` describes `apps/web/e2e/` as its home, but nothing was ever installed. Standing it up — config, a `webServer` that boots the API and the web app, CI wiring with a Postgres service and a seeded fixture user — is part of this module.
- Visual regression compares each screen against a **committed baseline screenshot of this app**, not against the mockup (see Non-Goals). Its value is catching unintended layout drift on later PRs; the first baseline is approved by human review against the prototype, and that review is what the "matches the mockup" criterion below actually rests on.

## Acceptance Criteria

- [ ] Dashboard renders header, donuts, chart, holdings grid, summary cards, and the advisor panel, in the mockup's layout order — asserted by test, with fidelity to the prototype confirmed by human review at baseline time.
- [ ] A committed visual-regression baseline exists for the dashboard, and a deliberate layout change fails the check until the baseline is re-approved.
- [ ] `pnpm --filter web test:e2e` runs the Playwright suite against a booted API + web app, locally and in CI, and CI fails when a spec fails.
- [ ] `AllocationDonut` renders correctly with 1 slice, many slices, and an empty list (no holdings yet) without crashing.
- [ ] Performance chart range toggle (6M/1Y/ALL) re-fetches and re-renders without a full page reload.
- [ ] Holdings page CSV upload shows per-row success/error feedback matching the backend's `{ created, updated, errors[] }` response.
- [ ] Unauthenticated visits to any `(dashboard)` route redirect to `/login`.
- [ ] Advisor panel's `loading` state can't be triggered twice concurrently (button disabled while a request is in flight).
- [ ] Clicking logout calls `POST /auth/logout`, lands on `/login`, and a subsequent direct visit to a `(dashboard)` route redirects back to `/login` rather than rendering from a still-valid cookie.
