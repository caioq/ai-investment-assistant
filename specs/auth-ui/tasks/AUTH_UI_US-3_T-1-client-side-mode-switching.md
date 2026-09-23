# AUTH_UI_US-3_T-1: Client-side mode switching in `AuthScreen`

**Story:** [../stories/US-3-switch-modes.md](../stories/US-3-switch-modes.md)
**Status:** Done
**GitHub Issue:** #286 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-2_T-4

Make the segmented control's two buttons and the bottom switch line change `mode` inside the mounted `AuthScreen`. The switch line becomes "Create one" / "Sign in", as `<button>`s rather than links.

On each switch:
- Call `window.history.replaceState(null, '', mode === 'signin' ? '/login' : '/register')`. Never use `router.replace`, which remounts (spec → Behavior Notes → Mode switching).
- Keep `email`, `password` and `name` in state; `name` is kept even while hidden.
- Clear the submitted/touched flags and all field and form errors.
- Swap `BrandPanel`'s content, the title, the subtitle and the submit label.
- Move focus to the `h1` title (`tabIndex={-1}`).

The active segment has `aria-pressed="true"`. Clicking the already-active segment is a no-op.

**Test:** `apps/web/components/auth/AuthScreen.test.tsx` (extend; spy on `window.history.replaceState`):
1. From `startMode="signin"`, type the email `ana@` and the password `secret123`, then submit so "Enter a valid email address." shows. Click the segmented "Create account": `replaceState` is called with `'/register'`, the inputs still hold `ana@` and `secret123`, the Name field appears, no error text remains, and `document.activeElement` is the "Create your account" heading.
2. Click the switch-line "Sign in": `replaceState` is called with `'/login'`, and the title is "Welcome back".
3. The "Create account" segment has `aria-pressed="true"` while in signup mode.
4. `router.replace` and `router.push` are never called during a switch.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
