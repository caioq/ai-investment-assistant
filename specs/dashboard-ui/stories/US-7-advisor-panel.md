# US-7: Get the AI advisor's read on my portfolio

**Status:** Ready
**Traces to:** spec Goal "Single dashboard page showing: … and the AI Advisor panel" / spec Behavior Notes "`AdvisorPanel` state machine: `idle` → `loading` → `report`", "Dashboard page loads `GET /advisor/analysis/latest` on mount" / spec AC "Advisor panel's `loading` state can't be triggered twice concurrently" (in `../spec.md`)

As an investor holding thirty-odd positions, I want to hand the advisor my research house's report and its model wallets and get back strengths, risks and recommendations in one panel, so that the analysis the backend can already produce is one click away.

## Tasks

- [ ] [T-1: `AdvisorReportUpload`](../tasks/DASHBOARD_UI_US-7_T-1-advisor-report-upload.md)
- [ ] [T-2: `RecommendedPortfoliosUpload`](../tasks/DASHBOARD_UI_US-7_T-2-recommended-portfolios-upload.md)
- [ ] [T-3: `AdvisorAnalysisResult`](../tasks/DASHBOARD_UI_US-7_T-3-advisor-analysis-result.md)
- [ ] [T-4: `AdvisorPanel` state machine](../tasks/DASHBOARD_UI_US-7_T-4-advisor-panel-state-machine.md)
- [ ] [T-5: load the latest analysis and wire the panel](../tasks/DASHBOARD_UI_US-7_T-5-latest-analysis-on-load.md)

## Notes

**Every click of "Generate Portfolio Analysis" is a paid Claude call.** That's why the double-submit guard is a spec AC of its own here and not just good manners, and why `T-5` seeds the panel from `GET /advisor/analysis/latest` instead of generating on load. Disable the button *and* guard the handler against re-entry — a disabled-looking button can still be re-triggered by keyboard.

**`404` from `/advisor/analysis/latest` is the expected new-user response, not an error.** The endpoint is specified to return it when nothing exists yet. Catching exactly that status is what keeps the whole dashboard from failing to render for every user who hasn't clicked generate — which is every user, once.

**Uploading a report is optional.** `POST /advisor/analyze` succeeds without an `advisorReportId` (an explicit advisor spec AC). Word the UI so, or users will think the advisor is blocked until they find a PDF.

**`wallet` is chosen, never inferred.** The [recommended-portfolios](../../recommended-portfolios/spec.md) spec is explicit: guessing it from the filename files one wallet's recommendations under another. No pre-selected default — that's a guess with extra steps.

**"Ask Another Question" is a local transition and deletes nothing.** Back to `idle`, no `DELETE` request, analysis still persisted for the next page load.

**The panel renders `Json` columns.** `strengths`/`risks`/`recommendations`/`impactMetrics` have no compile-time shape guarantee from Prisma, and an empty `risks` array is a legitimate model response — three headings over blank space reads as a bug, so each column needs its own empty state. `impactMetrics.value` is a string the model wrote; render it verbatim.
