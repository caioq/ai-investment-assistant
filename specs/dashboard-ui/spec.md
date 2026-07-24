# Dashboard UI

**Status:** Approved
**Depends on:** [auth](../auth/spec.md), [portfolio](../portfolio/spec.md), [advisor](../advisor/spec.md)

## Problem

All the backend modules need one coherent screen where the user can see their portfolio and trigger the AI Advisor. [resources/UI/portfolio-dashboard.html](../../resources/UI/portfolio-dashboard.html) is an existing static mockup (a declarative prototype, not production code) that already defines the target UX and should be used as the visual reference.

## Goals

- Single dashboard page showing: header (total value, daily change), two allocation donuts (by sector, by stock — extensible to style/risk), a performance line chart with benchmark overlay and range toggle, a holdings grid, summary cards, and the AI Advisor panel.
- Holdings management page: manual add form + CSV upload.
- Auth pages: login, register.

## Non-Goals

- Any chart/data library beyond what's needed to replicate the mockup — the donut is CSS `conic-gradient`, the line chart is hand-rolled SVG mirroring the mockup's technique. No new charting dependency in v1.
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
  (dashboard)/layout.tsx           # auth guard, server component reading the cookie
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
  auth/LoginForm.tsx, RegisterForm.tsx
  ui/ (Button, Card, Badge)
lib/
  api-client.ts   # fetch wrapper, credentials: 'include'
  types.ts        # re-exports from packages/shared
```

- `AllocationDonut` is the main reuse point: same component serves sector, stock, and (once populated) investment-style/risk-rating breakdowns, and later asset-class breakdown when fixed income/crypto exist — only the `slices` prop changes.
- `AdvisorPanel` state machine: `idle` → (click "Generate Portfolio Analysis") → `loading` → `report` (or `error`). "Ask Another Question" resets to `idle` without deleting the persisted analysis.
- Dashboard page loads `GET /advisor/analysis/latest` on mount to show a previously generated report without spending API budget.

## Acceptance Criteria

- [ ] Dashboard visually matches the mockup's layout for header, donuts, chart, holdings grid, summary cards, and advisor panel states.
- [ ] `AllocationDonut` renders correctly with 1 slice, many slices, and an empty list (no holdings yet) without crashing.
- [ ] Performance chart range toggle (6M/1Y/ALL) re-fetches and re-renders without a full page reload.
- [ ] Holdings page CSV upload shows per-row success/error feedback matching the backend's `{ created, updated, errors[] }` response.
- [ ] Unauthenticated visits to any `(dashboard)` route redirect to `/login`.
- [ ] Advisor panel's `loading` state can't be triggered twice concurrently (button disabled while a request is in flight).
