# DATA_SOURCES_US-1_T-2: `/data-sources` page shell and the four source cards

**Story:** [../stories/US-1-see-whats-imported.md](../stories/US-1-see-whats-imported.md)
**Status:** Done
**GitHub Issue:** #318 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-1_T-1, DATA_SOURCES_SHARED_T-5

Add `apps/web/app/(dashboard)/data-sources/page.tsx` — a Server Component inheriting the group's auth guard — which fetches `GET /data-sources/summary` (forwarding the cookie, as `(dashboard)/page.tsx` does) and renders the page header plus a `'use client'` `DataSourcesPanel` that owns the selected source.

- **Header**: "Data sources" in Fraunces 26px, with a line of copy explaining that assets come first. Fraunces is currently loaded only in the `(auth)` layout, so load it for this route too.
- **Four `SourceCard`s** (`apps/web/components/data-sources/SourceCard.tsx`): step number, name, CSV/PDF format label, one-line description and a meta line — `{date} · {n} assets`, `{date} · {n} positions`, `{n} of 3 wallets imported`, `{report title} · {date}`, or "Never imported".
- Selecting a card is a button press: `--blue` border and blue step circle, `aria-pressed`, and it reveals that source's panel below. The panels themselves arrive with US-2 onwards; until then the selected card shows an empty placeholder panel.
- The page opens on **Assets**.
- A failed summary fetch degrades to cards reading "Never imported" rather than taking the page down (CONVENTIONS.md → "Dashboard page composition").

**Test:** `apps/web/app/(dashboard)/data-sources/page.test.tsx` and `apps/web/components/data-sources/SourceCard.test.tsx` (Vitest + RTL; mock `next/headers` and the api client):
1. The page renders the "Data sources" heading and all four card names.
2. Given a summary with 128 assets, 12 holdings, one wallet and a report, each card's meta line shows those values, including "1 of 3 wallets imported".
3. Given an empty summary, all four cards read "Never imported".
4. Assets is selected on load (`aria-pressed="true"`); clicking Holdings moves the selection.
5. A rejected summary fetch still renders four cards, all "Never imported", and no error is thrown.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
