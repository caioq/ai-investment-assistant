# US-1: Give the advisor the research house's report

**Status:** Ready
**Traces to:** spec Goal "Upload and extract text from a PDF (or accept pasted text) as the free-text recommendation report." / spec API Contract `POST /advisor/reports/upload` / spec ACs "Uploading a valid PDF report results in a non-empty `AdvisorReport.rawText`.", "Uploading a corrupt/invalid PDF returns a clear 4xx error, not a 500 or a silently empty `rawText`." (in `../spec.md`)

As someone who receives a monthly PDF commentary from my research house, I want to hand that document to the advisor, so its analysis reflects what my analysts are actually saying rather than only what my spreadsheet shows.

## Tasks

- [ ] [T-1: PDF text extraction](../tasks/ADVISOR_US-1_T-1-pdf-text-extraction.md)
- [ ] [T-2: POST /advisor/reports/upload](../tasks/ADVISOR_US-1_T-2-report-upload-endpoint.md)

## Notes

**Prose only.** The spec's Non-Goals rule out extracting tickers or prices from the PDF's own tables — that's [recommended-portfolios](../recommended-portfolios/spec.md)'s CSV upload. This story stores text and nothing else, so there is no parsing task here beyond "PDF in, string out".

**A report is optional context, not a precondition.** `POST /advisor/analyze` works without one (its own AC), so nothing in US-2 blocks on this story. They can be built in either order.

The endpoint accepts *either* a multipart PDF *or* a JSON `{ sourceName?, text }` body. That split is why T-1 is a separate, unit-testable extraction step: the pasted-text path skips it entirely, and making extraction a service method rather than controller logic keeps the corrupt-PDF case testable without multipart machinery.
