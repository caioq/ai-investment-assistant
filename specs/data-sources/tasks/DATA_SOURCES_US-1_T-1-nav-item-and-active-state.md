# DATA_SOURCES_US-1_T-1: "Data sources" nav item and active-item styling

**Story:** [../stories/US-1-see-whats-imported.md](../stories/US-1-see-whats-imported.md)
**Status:** Not Started
**GitHub Issue:** #317 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

In `apps/web/app/(dashboard)/layout.tsx`, add `{ href: '/data-sources', label: 'Data sources' }` to `NAV_ITEMS`, and give the rail the active-item treatment it has never had: the link matching the current path gets `aria-current="page"` plus a selected style (a `--bg-card-alt` pill with `--text-primary`; the others stay tertiary).

The layout is a Server Component and `usePathname` is client-only, so extract the nav into a small `'use client'` child (for example `apps/web/components/layout/SidebarNav.tsx`) rather than making the whole layout — and its `getCurrentUser` guard — client-side (CONVENTIONS.md → "Component conventions").

Exact matching for `/`, prefix matching for the others, so `/data-sources` doesn't also light up Dashboard.

**Test:** `apps/web/components/layout/SidebarNav.test.tsx` (Vitest + RTL, `next/navigation`'s `usePathname` mocked):
1. All three items render, with `/data-sources` labelled "Data sources".
2. With pathname `/data-sources`, that link has `aria-current="page"` and the other two do not.
3. With pathname `/`, only Dashboard has it — `/holdings` and `/data-sources` do not.
4. With pathname `/holdings`, only Holdings has it.

`apps/web/app/(dashboard)/layout.test.tsx` keeps passing (the guard and logout behaviour are unchanged).

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
