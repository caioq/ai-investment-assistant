# DATA_SOURCES_SHARED_T-10: Playwright flow and visual baselines

**Shared by:** every story
**Status:** Done
**GitHub Issue:** #328 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-2_T-1, DATA_SOURCES_US-6_T-1, DATA_SOURCES_US-7_T-1, DATA_SOURCES_US-7_T-2

Add `apps/web/e2e/data-sources.spec.ts` covering the browser-only acceptance criteria, and regenerate the visual baselines the removals in US-7 invalidate.

**Test:** `apps/web/e2e/data-sources.spec.ts`:
1. **Redirect** — visiting `/data-sources` signed out lands on `/login`.
2. **Full assets flow** — sign in, open `/data-sources` from the rail, attach a fixture assets CSV with 10 rows of which 2 have an invalid `riskRating`, and assert: the summary reads 10/8/2, the button reads "Import 8 assets", clicking it shows the success banner, the Assets card meta updates, and a history row appears. Reload: the card and the history row are still there, and the row shows "8 · 2 rejected".
3. **Wrong file type** — dropping a PDF on the assets zone attaches nothing and shows "… is not a CSV file."
4. **Active nav** — the rail's Data sources item has `aria-current="page"`.
5. **Reduced motion** — with `page.emulateMedia({ reducedMotion: 'reduce' })`, the import spinner's computed `animation-name` is `none` (route the upload to a delayed response to observe it).

Fixtures go in `apps/web/e2e/fixtures/data-sources/`, with a `README.md` explaining why the invalid rows are invalid (CONVENTIONS.md → "Testing"). Clean up imported rows with a scoped `pg` delete, as `global-setup.ts` does.

Then regenerate `apps/web/e2e/dashboard-visual.spec.ts-snapshots/*-chromium-linux.png` **inside the Playwright container** per `apps/web/e2e/README.md` — the dashboard and holdings pages lose their upload controls in US-7, so the committed baselines no longer match.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes. The full `pnpm --filter web test:e2e` must pass in CI with the regenerated baselines committed.
