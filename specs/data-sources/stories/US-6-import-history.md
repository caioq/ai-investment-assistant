# US-6: See what was imported before

**Status:** Ready
**Traces to:** spec Goal "An import history that survives a reload"; ACs "A successful assets import … prepends a history row, and both persist after a reload", "A failed import … writes a `FAILED` history row", "Importing an assets CSV with 2 rows the server rejects writes one `IMPORTED` history row — not one row per error …" (in `../spec.md`)

As someone who imports files regularly, I want a history of what I imported and what was rejected, so that "did that file actually go in?" has an answer after I've dismissed the banner.

## Tasks

- [ ] [T-1: Import history table](../tasks/DATA_SOURCES_US-6_T-1-import-history-table.md)

Shared tasks this story relies on: [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md).

## Notes

- **One row per import attempt, never one per error.** A partial success is a single `IMPORTED` row whose `errors` array holds every rejected row, rendered as "28 · 12 rejected" and expandable.
- Writing the log is each source panel's job (it happens right after its upload resolves); this story only reads and renders it.
