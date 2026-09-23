# DATA_SOURCES_US-5_T-1: `title`, `publisher` and `publishedAt` on `AdvisorReport`

**Story:** [../stories/US-5-add-research-report.md](../stories/US-5-add-research-report.md)
**Status:** Done
**GitHub Issue:** #323 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the three nullable columns to `AdvisorReport` with a migration, exactly as [advisor](../../advisor/spec.md) now declares them: `title String?`, `publisher String?`, `publishedAt DateTime? @map("published_at") @db.Date`.

Accept them as optional fields on `POST /advisor/reports/upload` (`UploadReportBodyDto`: `@IsOptional` + `@IsString` for the two strings, `@IsDateString` for the date) on **both** the multipart and the JSON path, and persist them. Omitting all three must keep working unchanged — they are nullable precisely so existing rows and API callers stay valid.

Return them in the created `AdvisorReport` response.

**Test:** `apps/api/test/advisor.e2e-spec.ts` (extend):
1. Uploading a PDF with `title`, `publisher` and `publishedAt` returns 201 with all three echoed, and they are persisted.
2. Uploading the same PDF with none of them still returns 201, with all three `null`.
3. `publishedAt: 'not-a-date'` returns 400.
4. The existing report-upload and analyze cases still pass unmodified.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
