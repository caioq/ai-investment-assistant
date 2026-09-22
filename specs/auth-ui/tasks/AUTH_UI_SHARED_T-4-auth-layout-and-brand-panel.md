# AUTH_UI_SHARED_T-4: Two-column `(auth)` layout, Fraunces, `BrandPanel`

**Shared by:** US-1, US-2, US-3
**Status:** Done
**GitHub Issue:** #276 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Build the screen shell the forms sit in.

- **`apps/web/app/(auth)/layout.tsx`** becomes a full-viewport CSS grid (`1.05fr` / `1fr`) and drops the `maxWidth: 400px` wrapper. It loads **Fraunces** (500/600) with `next/font/google` as `--font-fraunces`, **in this layout only**.
- **`apps/web/components/auth/auth-content.ts`** exports `PRODUCT_NAME = "AI Investment Assistant"`, `TRUST_SIGNALS`, and an `AUTH_CONTENT` record keyed by `'signin' | 'signup'`. Each entry holds the form title, subtitle, brand headline, brand paragraph and three value points, copied **verbatim** from spec → Behavior Notes → Content per mode.
- **`apps/web/components/auth/BrandPanel.tsx`** takes `mode: 'signin' | 'signup'` and renders:
  - the navy gradient panel, with its two radial blurs clipped to the panel
  - the logo mark and `PRODUCT_NAME` in Fraunces
  - the mode's headline, paragraph and three value points
  - the trust row, whose first signal has a pulsing emerald dot (static under `prefers-reduced-motion: reduce`); trust text is at least 60% white
- **Below 900px** the brand panel is hidden, and a compact logo mark plus `PRODUCT_NAME` show above the form column.
- **CONVENTIONS.md → "Design tokens":** replace the "Fraunces … deliberately not loaded" sentence with the scoped-to-`(auth)` rule.

**Test:** `apps/web/components/auth/BrandPanel.test.tsx` (Vitest + RTL):
1. `mode="signin"` renders "Your whole portfolio, in one clear view." and the three Sign in value points.
2. `mode="signup"` renders "Start with clarity, not spreadsheets." and the three Create account value points.
3. Both modes render `PRODUCT_NAME` and the three trust signals.
4. The rendered text contains none of "Portland", "S&P 500" or "SOC 2".

The layout gets a smoke test in `apps/web/app/(auth)/layout.test.tsx`: it renders its children. The breakpoint and layout are asserted in the browser by AUTH_UI_SHARED_T-6.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
