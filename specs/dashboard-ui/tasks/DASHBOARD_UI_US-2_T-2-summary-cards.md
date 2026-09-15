# DASHBOARD_UI_US-2_T-2: `SummaryCards`

**Story:** [../stories/US-2-portfolio-header-summary.md](../stories/US-2-portfolio-header-summary.md)
**Status:** Not Started
**GitHub Issue:** #213 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/SummaryCards.tsx` — the stat row under the hero, built from `Card` and `Badge`. Takes a `PortfolioSummary` plus a holdings count as props:

- **Total return** — `gainLoss` in BRL with `returnPct` as a toned badge.
- **Total invested** — `totalInvested`, sub-labelled "Cost basis".
- **Holdings** — the position count.

Three cards, not the mockup's four: its fourth is "Cash available", which has no backend field (see `US-2_T-1`). The mockup's "Across 8 sectors" sub-label also isn't derivable from `/portfolio/summary` alone — leave it out rather than firing a second request from a stat card.

An empty portfolio must render zeroes, not an empty row: `returnPct` is `0` when `totalInvested` is `0`, and the neutral badge tone is the right one — a `0%` return is neither a gain nor a loss.

**Test:** `apps/web/components/dashboard/SummaryCards.test.tsx` (Vitest + RTL): (1) renders all three cards with BRL-formatted values from a populated summary; (2) a negative `gainLoss` gets the negative badge tone, a positive one the positive tone; (3) an all-zero summary with zero holdings renders three cards, a neutral tone, and no `NaN`/`Infinity` anywhere in the output — the division-by-zero case a real new account hits on first load.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
