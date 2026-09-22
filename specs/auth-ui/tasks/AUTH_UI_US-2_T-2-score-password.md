# AUTH_UI_US-2_T-2: `scorePassword` in `packages/shared`

**Story:** [../stories/US-2-create-account.md](../stories/US-2-create-account.md)
**Status:** Done
**GitHub Issue:** #282 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `scorePassword(password: string): { score: 0 | 1 | 2 | 3 | 4; label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' }` to `packages/shared/src/password-strength.ts` and re-export it from `index.ts`.

Scoring, per spec → Password strength meter: add 1 for each of the following, then cap at 4.
- length ≥ 8
- length ≥ 12
- contains both `[a-z]` and `[A-Z]`
- contains `[0-9]`
- contains `/[^A-Za-z0-9]/`

Labels by score: 0 Too weak, 1 Weak, 2 Fair, 3 Good, 4 Strong. Pure function; colours stay in the web component.

**Test:** `packages/shared/src/password-strength.test.ts` (Vitest), a table test:

| Input | Expected |
|---|---|
| `""` | `{0,'Too weak'}` |
| `"abc"` | `{0,'Too weak'}` |
| `"abcdefgh"` | `{1,'Weak'}` |
| `"abcdefgh1"` | `{2,'Fair'}` |
| `"Abcdefgh1"` | `{3,'Good'}` |
| `"Abcdefgh1!xy"` | `{4,'Strong'}`, where the raw score of 5 is capped |
| `"abcdefghijkl"` | `{2,'Fair'}` |

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
