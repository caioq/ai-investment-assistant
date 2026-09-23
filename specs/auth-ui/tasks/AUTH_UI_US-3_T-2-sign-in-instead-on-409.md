# AUTH_UI_US-3_T-2: "Sign in instead" action on a 409

**Story:** [../stories/US-3-switch-modes.md](../stories/US-3-switch-modes.md)
**Status:** Done
**GitHub Issue:** #287 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-3_T-1

When Create account's `POST /auth/register` rejects with `ApiError` 409, render a "Sign in instead" `<button>` inside the Email field's error ("This email is already registered."). Clicking it runs the same mode switch as AUTH_UI_US-3_T-1, to Sign in mode, with the email kept (spec → Server and network errors).

**Test:** `apps/web/components/auth/AuthScreen.test.tsx` (extend):
1. In signup mode, `apiFetch` rejects with `new ApiError(409, …)` after submitting `ana@example.com`. The "Sign in instead" button appears.
2. Clicking it switches to "Welcome back", calls `replaceState` with `'/login'`, keeps the Email input at `ana@example.com`, and clears the 409 message.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
