# AUTH_UI_US-2_T-3: `PasswordStrengthMeter` component and `--amber` token

**Story:** [../stories/US-2-create-account.md](../stories/US-2-create-account.md)
**Status:** Not Started
**GitHub Issue:** #283 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-2_T-2

Add `--amber: #B8862F` to `:root` in `apps/web/app/globals.css`, and add it to the token list asserted by `apps/web/app/globals.test.ts`.

Add `apps/web/components/auth/PasswordStrengthMeter.tsx`, which takes `password: string` and calls `scorePassword`. It renders:
- **Segments:** four segments, 4px tall with 4px gaps, wrapped in an `aria-hidden="true"` container. The first `score` segments are filled in one colour and the rest use `--border`.
- **Colours:** by score: 0–1 `--red`, 2 `--amber`, 3 `--blue`, 4 `--emerald`.
- **Caption row:** the hint on the left and the label on the right (700 weight, in the matching colour).
  - When `password === ""`, the hint is "Use 8+ characters".
  - Otherwise it's "Mix upper, lower, numbers, and a symbol".

**Test:** `apps/web/components/auth/PasswordStrengthMeter.test.tsx` (Vitest + RTL):
1. `password=""` shows "Use 8+ characters" and the label "Too weak".
2. `password="abcdefgh1"` shows "Mix upper, lower, numbers, and a symbol" and "Fair", with exactly 2 segments whose style references `var(--amber)`.
3. `password="Abcdefgh1!xy"` shows "Strong", with 4 segments referencing `var(--emerald)`.
4. The segment container has `aria-hidden="true"`, while the label text is not hidden.

`apps/web/app/globals.test.ts` must also pass with `--amber` added.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
