# DATA_SOURCES_US-5_T-2: Research report panel

**Story:** [../stories/US-5-add-research-report.md](../stories/US-5-add-research-report.md)
**Status:** Done
**GitHub Issue:** #324 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-5_T-1, DATA_SOURCES_US-2_T-1, DATA_SOURCES_SHARED_T-6

Wire the **report** source through `ImportPanel` with a PDF-shaped body instead of a CSV review.

- Details (all required): Report title, Publisher, Publication date. Until they're filled, the gate hint reads "Add title, publisher and publication date."
- `DropZone` with `accept=".pdf"`; a non-PDF is rejected with "{file} is not a PDF file." and nothing attaches. No "Download CSV template" button.
- Once attached: a `FileChip` showing `{size} · {pages} pages` (read the page count in the browser), plus a short panel explaining that the advisor uses the most recent report — naming the current one from the summary when there is one. **No** "sectors referenced" panel (spec → Non-Goals).
- The primary button reads "Add to AI context", becoming "Processing" while in flight.
- Import posts multipart to `POST /advisor/reports/upload` with the file plus `title`, `publisher`, `publishedAt`. On success: clear the file, log `{ source: 'REPORT', records: 1 }`, refresh the summary so the report card shows the new title, and show "\"{title}\" added to AI Advisor context."
- **PDF only**: no paste-text mode (spec → Non-Goals).

**Test:** `apps/web/components/data-sources/ImportPanel.report.test.tsx` (Vitest + RTL):
1. With empty details, the button is disabled and shows "Add title, publisher and publication date."
2. Dropping a `.csv` shows "… is not a PDF file." and attaches nothing.
3. With the details filled and a PDF attached, the button reads "Add to AI context" and is enabled.
4. Importing posts multipart to `/advisor/reports/upload` carrying the file and all three fields.
5. Success clears the file, posts an `ImportLog` with `source: 'REPORT'` and `records: 1`, and shows a banner naming the title.
6. No control offers pasting report text.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
