# ADVISOR_US-1_T-2: POST /advisor/reports/upload

**Story:** [../stories/US-1-upload-report.md](../stories/US-1-upload-report.md)
**Status:** Not Started
**GitHub Issue:** #186 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_US-1_T-1

Add `POST /advisor/reports/upload`, which accepts **either** a multipart PDF **or** a JSON `{ sourceName?, text }` body, and creates an `AdvisorReport` scoped to `req.user.id`.

Follow `CONVENTIONS.md` → "File uploads": `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: <bytes> } }))` with in-memory storage, `@UploadedFile() file: Express.Multer.File | undefined`. That convention also documents the shape this endpoint needs — a multipart request whose other fields arrive as a plain `@Body()` DTO validated by the global `ValidationPipe`, exactly as `UploadWalletBodyDto` does for `recommended-portfolios`.

Routing between the two paths: if a file is attached, extract with `extractPdfText` and set `fileName` from `file.originalname`; otherwise require a non-empty `text` in the body and store it verbatim with `fileName: null`. **Neither present is a `BadRequestException`** — not a report with empty `rawText`. `sourceName` is optional in both paths.

Note the PDF size limit should be its own constant rather than reusing the CSV one — a research report PDF is legitimately larger than a holdings spreadsheet, and silently rejecting a real report at 1 MB would look like a broken upload.

**Test:** `apps/api/test/advisor.e2e-spec.ts` (extending the suite from `ADVISOR_SHARED_T-2`, same scoped `afterEach`, fixture emails namespaced to this suite): (1) no auth cookie → `401`; (2) authed multipart upload of the valid PDF fixture → `201`/`200` with a persisted `AdvisorReport` whose `rawText` is non-empty and whose `fileName` matches the uploaded name; (3) authed JSON `{ text: 'some prose' }` → persists with `rawText` equal to that text and `fileName: null`; (4) authed multipart upload of a non-PDF buffer → `400`, and **no** `AdvisorReport` row is created — assert the row count, since a 400 that still persists an empty report is the failure mode worth pinning; (5) authed request with neither file nor `text` → `400`. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
