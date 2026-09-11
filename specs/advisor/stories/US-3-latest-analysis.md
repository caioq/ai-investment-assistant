# US-3: See my last analysis without paying for it again

**Status:** Done
**Traces to:** spec Goal "Cache the result — regenerating costs API money and shouldn't happen on every page load." / spec API Contract `GET /advisor/analysis/latest` / spec AC "`GET /advisor/analysis/latest` after a page reload returns the same analysis without a new call to the Claude API (verify via a mocked client asserting call count)." (in `../spec.md`)

As someone who reloads the dashboard several times a day, I want the panel to show the analysis I already generated, so refreshing a page doesn't quietly spend money on the Claude API.

## Tasks

- [x] [T-1: GET /advisor/analysis/latest](../tasks/ADVISOR_US-3_T-1-latest-analysis-endpoint.md)

## Notes

This is the whole caching design. There is no TTL, no invalidation and no cache table: `POST /advisor/analyze` always *appends* an `AdvisorAnalysis` row and this endpoint reads the newest one for the user. Regeneration is user-triggered only (a spec Non-Goal rules out re-running on holdings/price changes), so "stale" is a state the user chose.

`404` when the user has never generated one is deliberate — it's what tells the dashboard to render the idle "Generate Portfolio Analysis" state rather than an empty panel.

The `@@index([userId, createdAt])` in the spec's Data Model exists for this query specifically; it's added by `ADVISOR_SHARED_T-1`.
