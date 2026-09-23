# US-5: Add a research report

**Status:** Ready
**Traces to:** spec Goal "four sources: … Research report (PDF)"; ACs "Uploading a report with title, publisher and publication date shows them on the report card, and `GET /data-sources/summary` returns them" and "`POST /advisor/reports/upload` without the new fields still succeeds" (in `../spec.md`)

As someone using the AI advisor, I want to add my research house's PDF report with its title and date, so that the advice cites a report I can recognise rather than a file name.

## Tasks

- [x] [T-1: `title`, `publisher` and `publishedAt` on `AdvisorReport`](../tasks/DATA_SOURCES_US-5_T-1-report-metadata-fields.md)
- [ ] [T-2: Research report panel](../tasks/DATA_SOURCES_US-5_T-2-report-panel.md)

Shared tasks this story relies on: [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md), [SHARED_T-5](../tasks/DATA_SOURCES_SHARED_T-5-summary-endpoint.md), [SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md), [SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md).

## Notes

- **PDF only.** The endpoint still accepts pasted text for API callers, but this panel offers no paste mode (spec → Non-Goals). Deleting `AdvisorReportUpload` in US-7 removes the only UI for it, deliberately.
- There is no CSV review here: the PDF panel shows file name, size and page count, the three detail fields, and a note that the advisor uses the most recent report.
- The three new fields are **nullable**, so existing rows and API callers that omit them keep working.
