# AUTH_UI_SHARED_T-1: `isValidEmail` in `packages/shared`

**Shared by:** US-1, US-2
**Status:** Done
**GitHub Issue:** #273 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `packages/shared/src/validation.ts` exporting `isValidEmail(email: string): boolean` using the spec's pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`, and re-export it from `packages/shared/src/index.ts`. Pure function, no trimming inside it: callers decide whether to trim.

**Test:** `packages/shared/src/validation.test.ts` (Vitest). `isValidEmail` returns:
- `true` for `ana@example.com` and `a.b+c@sub.domain.com.br`
- `false` for `""`, `ana@`, `ana@example`, `@example.com`, `ana example@x.com` and `ana@@example.com`

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
