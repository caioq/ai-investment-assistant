# ADVISOR_US-1_T-1: PDF text extraction

**Story:** [../stories/US-1-upload-report.md](../stories/US-1-upload-report.md)
**Status:** Done
**GitHub Issue:** #185 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_SHARED_T-2

Add `pdf-parse` as an `apps/api` dependency (it is **not** currently installed) and a service method that turns a PDF buffer into text: `AdvisorService.extractPdfText(buffer: Buffer): Promise<string>`.

A corrupt, empty, or non-PDF buffer must throw `BadRequestException` with a message naming the problem — per the spec's AC, a bad upload is a clear 4xx, never a 500 and never a silently empty `rawText`. Treat "parsed but produced only whitespace" as a failure too: a scanned image-only PDF parses without throwing and yields nothing usable, and storing that would produce an analysis grounded in an empty report while looking like success.

Keep this a pure buffer→string method with no Prisma and no HTTP concerns, so the failure cases are unit-testable without multipart machinery. Persisting the result is `ADVISOR_US-1_T-2`'s job.

**Test:** `apps/api/src/advisor/advisor.service.spec.ts` (colocated unit spec, `PrismaService` mocked per `CONVENTIONS.md` → "Testing"): (1) a small valid PDF fixture extracts to a string containing a known sentence; (2) a buffer of plain text bytes (`Buffer.from('not a pdf')`) throws `BadRequestException`, **not** a generic `Error` — assert the exception type, since the type is what produces a 4xx instead of a 500; (3) an empty buffer throws `BadRequestException`; (4) a PDF that parses to whitespace only throws rather than returning `''`. The valid-PDF fixture goes in `apps/api/test/fixtures/advisor/` with a `README.md` noting it is a generated stub, not a real research report — the repo is public. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
