# PORTFOLIO_SHARED_T-4: promote parseBrazilianNumber to packages/shared

**Shared by:** US-2 (and every future importer of a Brazilian-formatted export)
**Status:** Not Started
**GitHub Issue:** #172 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Move `parseBrazilianNumber` from `apps/api/src/recommended-portfolios/brazilian-number.ts` into `packages/shared/src/brazilian-number.ts` and re-export it from `packages/shared/src/index.ts`.

The holdings CSV now carries the same Brazilian formatting the wallet exports do (`"R$ 23,68"`, `"9,37"`, thousands-separated `"R$ 589.394,17"`), so `portfolio` needs this function too. The two options are a cross-feature-module import (`portfolio` reaching into `recommended-portfolios/`) or a second copy — both bad, and `CLAUDE.md` already names the third: *"Pure/testable logic … belongs in `packages/shared`, not duplicated."* This function is pure, has no Nest or Prisma dependency, and is exactly that.

Do **not** rewrite the function. Its three-outcome contract (a `number`; `null` for absent; `NaN` for present-but-unparseable) and the rule that a `.` is only stripped when it groups digits in threes are both load-bearing and were carefully arrived at — this task is a move plus an import-path update, not a redesign.

Three follow-through edits, all of which will otherwise break the build rather than fail quietly:

- `apps/api/src/recommended-portfolios/wallet-row.ts` imports it and must switch to `@ai-investment-assistant/shared`.
- The existing `brazilian-number.spec.ts` is a **Jest** spec with implicit globals; `packages/shared` runs **Vitest**, whose specs are `*.test.ts` and import `{ describe, expect, it } from "vitest"` explicitly (see `packages/shared/src/allocation.test.ts`). Move it to `packages/shared/src/brazilian-number.test.ts` and convert the imports — the assertions themselves carry over unchanged.
- `CONVENTIONS.md` → "CSV parsing" points at the old path by file and task id; update it, since that entry is how the next person finds this function at all.

**Test:** `packages/shared/src/brazilian-number.test.ts` — the existing spec's cases moved verbatim and converted to Vitest, still covering all three outcomes (`"R$ 1.234,56"` → `1234.56`, `""`/`undefined` → `null`, `"abc"` → `NaN`) and the `"12.5"` → `12.5` guard that stops a stray en-US decimal being read as `125`. Green is the whole existing suite still passing from its new home, plus `pnpm --filter api test` and `test:e2e` still green (proving `wallet-row.ts`'s new import resolves). Red first is the file failing to resolve before the move.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
