# US-2: See what my portfolio is worth

**Status:** Ready
**Traces to:** spec Goal "Single dashboard page showing: header (total value, daily change) … and summary cards" / spec AC "Dashboard visually matches the mockup's layout for header … summary cards" (in `../spec.md`)

As an investor opening the app, I want the total value of my portfolio and how it has moved at the top of the page, so that I know where I stand before reading anything else.

## Tasks

- [ ] [T-1: `PortfolioHeader`](../tasks/DASHBOARD_UI_US-2_T-1-portfolio-header.md)
- [ ] [T-2: `SummaryCards`](../tasks/DASHBOARD_UI_US-2_T-2-summary-cards.md)
- [ ] [T-3: dashboard page shell](../tasks/DASHBOARD_UI_US-2_T-3-dashboard-page-shell.md)

## Notes

**This story owns `(dashboard)/page.tsx`, and US-3, US-4, US-5 and US-7 each add a section to it.** `T-3` is therefore the hinge of the whole module: four other stories are blocked on it, and they all subsequently edit the same file. Merge `T-3` promptly rather than leaving it on a branch for the others to stack on.

**The daily change has no backend field.** `GET /portfolio/summary` returns `{ totalInvested, currentValue, gainLoss, returnPct }` — nothing daily. `T-3` derives it from the last two points of `GET /portfolio/performance`, which works but carries two consequences the tasks pin: a series with fewer than two points has no daily change at all (render an em-dash, never `0`), and snapshots are weekday-only, so "since last close" spans the weekend on a Monday. See "Flagged for you" in the index — this is a portfolio-spec gap, not a UI choice.

**Three summary cards, not the mockup's four.** The mockup's "Cash available" has no backend concept behind it, and a hard-coded zero on the dashboard's most prominent row is worse than an absent card.
