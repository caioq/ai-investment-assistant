# T-<T> (US-<N>): <short task title>

**Story:** [../stories/US-<N>-<short-us-title>.md](../stories/US-<N>-<short-us-title>.md)
<!-- For a cross-cutting task instead of a single story, replace the line above with: **Shared by:** US-1, US-2 -->
**Status:** Not Started | In Progress | Done
**GitHub Issue:** #<issue-number> (<repo owner/name> — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

<One or two sentences describing exactly what to do. Reference concrete names from the spec — model fields, endpoint paths, component names — instead of paraphrasing them.>

**Test:** <Where the test lives (new or existing file) and exactly what it asserts — specific enough that "the test" is unambiguous. e.g. "`apps/api/test/portfolio.service.spec.ts` — 'computes CAGR from a 3-point PortfolioValueSnapshot series'". Follow the testing conventions in `CONVENTIONS.md`; if none exist yet for this area, propose a file path consistent with the stack (Jest specs in `apps/api`, Vitest/RTL in `apps/web`).>

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes. Not "implemented correctly," a passing, specific test.
