# US-1: See what's already imported

**Status:** Ready
**Traces to:** spec Goals "One page, `/data-sources`" and "Source cards showing real state"; ACs "`/data-sources` is reachable from the sidebar …" and "With an empty account, all four cards read 'Never imported' …" (in `../spec.md`)

As someone setting the app up, I want one page that shows what data the app already has, so that I know which file to import next instead of guessing.

## Tasks

- [ ] [T-1: "Data sources" nav item and active-item styling](../tasks/DATA_SOURCES_US-1_T-1-nav-item-and-active-state.md)
- [ ] [T-2: `/data-sources` page shell and the four source cards](../tasks/DATA_SOURCES_US-1_T-2-page-shell-and-source-cards.md)

Shared tasks this story relies on: [SHARED_T-5](../tasks/DATA_SOURCES_SHARED_T-5-summary-endpoint.md).

## Notes

- Selecting a card is what reveals its import panel, so T-2 owns the selection state even though the panels themselves arrive with US-2 onwards. Until then, the selected card shows an empty panel.
- The rail has **no** active-item styling today, so T-1 adds it for every item, not just the new one.
