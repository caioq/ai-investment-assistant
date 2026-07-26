# T-2 (US-3): Placeholder home page

**Story:** [../stories/US-3-frontend-placeholder-skeleton.md](../stories/US-3-frontend-placeholder-skeleton.md)
**Status:** Not Started
**GitHub Issue:** #7 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Add a placeholder home page at `apps/web/app/page.tsx` rendering the text "AI Investment Assistant — under construction" (Server Component, no client interactivity), per the spec's API Contract note: a single placeholder page at `/`, no other routes yet.

**Test:** `apps/web/app/page.test.tsx` (Vitest + React Testing Library, per `CONVENTIONS.md`) — renders `<Home />` and asserts the text "AI Investment Assistant — under construction" is present in the document.

**Done when:** that test passes red-green (write it first, confirm it fails because the page doesn't render that text yet, then implement until it passes).
