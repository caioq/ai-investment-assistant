# DASHBOARD_UI_US-7_T-3: `AdvisorAnalysisResult`

**Story:** [../stories/US-7-advisor-panel.md](../stories/US-7-advisor-panel.md)
**Status:** Not Started
**GitHub Issue:** #229 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/advisor/AdvisorAnalysisResult.tsx` — renders a persisted `AdvisorAnalysis`: the score ring, the summary, three columns (**Strengths** / **Risks** / **Recommendations**), and the impact metrics row, per the mockup's panel (line 270 onward).

Purely presentational — takes the analysis as a prop, fetches nothing.

- `score` is a `Float` from 0–10 (the advisor spec clamps it server-side). Render the ring as `score / 10` of a turn, with the numeric value beside it; a ring alone doesn't distinguish 6.8 from 7.2, which is the whole point of a score.
- `strengths`, `risks`, `recommendations` and `impactMetrics` are `Json` columns — arrays at runtime with no compile-time guarantee from Prisma. Render each as a list and handle an **empty** array with a per-column "none identified" rather than an empty column: a model output with zero risks is a legitimate response, and three headings above blank space reads as a rendering bug.
- `impactMetrics` is `{ label, value }[]` where `value` is already a **string** the model wrote. Render it verbatim — don't parse it as a number or append a `%`.
- Show `model` and `createdAt` in a footer. The analysis is persisted and re-shown on later visits (`US-7_T-5`), so "when was this generated, and by which model" is the difference between a current read and a stale one.

**Test:** `apps/web/components/dashboard/advisor/AdvisorAnalysisResult.test.tsx` (Vitest + RTL): (1) a fully-populated analysis renders the summary, all three column headings with an item per entry, every impact metric's label and verbatim string value, and the score numerically; (2) a `score` of `0` renders as `0`, not as a falsy blank; (3) an analysis whose `risks` is `[]` renders the Risks heading with its "none identified" state, not an empty column; (4) the footer shows `model` and a formatted `createdAt`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
