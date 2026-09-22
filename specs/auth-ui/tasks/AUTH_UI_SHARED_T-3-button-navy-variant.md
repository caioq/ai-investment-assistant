# AUTH_UI_SHARED_T-3: `Button` `navy` variant + reduced-motion spinner

**Shared by:** US-1, US-2
**Status:** Done
**GitHub Issue:** #275 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Extend `apps/web/components/ui/Button.tsx` with a `variant="navy"`.

- **Look:** a `--navy` → `--navy-2` gradient, white 14px/700 text, 13px×20px padding, 11px radius and a drop shadow. It lifts 1px on hover.
- **Loading state:** the existing `loading` prop still sets `disabled` + `aria-busy`, and it now renders a 14px white spinner (`data-testid="button-spinner"`) to the left of the label.
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)`, the hover lift and the spinner's rotation animation are disabled.

Existing variants (`primary`, `secondary`, `ghost`) are unchanged.

**Test:** `apps/web/components/ui/Button.test.tsx` (extend the existing file):
1. `variant="navy"` renders a button whose inline/background style references `var(--navy)`.
2. `loading` with `variant="navy"` renders `button-spinner` and sets `aria-busy="true"` and `disabled`.
3. The existing variant tests still pass.

Reduced motion is asserted in the browser by AUTH_UI_SHARED_T-6, since jsdom can't evaluate media queries.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
