# AUTH_UI_US-1_T-2: Sign in submit, loading state, and error mapping

**Story:** [../stories/US-1-sign-in.md](../stories/US-1-sign-in.md)
**Status:** Not Started
**GitHub Issue:** #279 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-1_T-1, AUTH_UI_SHARED_T-3

In `AuthScreen`'s Sign in mode, a valid submit posts `{ email: email.trim(), password }` to `POST /auth/login` through `apiFetch`.

- **Loading:** the navy `Button` is `loading` and its label reads "Signing in". A re-entry guard (`if (isSubmitting) return;`, per CONVENTIONS.md → "Disable-and-guard …") blocks a second request.
- **Success:** `router.push('/')`, then `router.refresh()`.
- **Errors:** map each failure to a form-level `role="alert"` message, verbatim from spec → Server and network errors:

  | Failure | Message |
  |---|---|
  | `ApiError` 401 | "Email or password is incorrect." |
  | `ApiError` 429 | "Too many attempts. Please wait a minute and try again." |
  | Any other rejection | "Couldn't reach the server. Please try again." |

- **Always:** loading ends in `finally`, and the email and password values are never cleared.

**Test:** `apps/web/components/auth/AuthScreen.test.tsx` (extend):
1. A valid submit calls `apiFetch('/auth/login', …)` once, with the trimmed email and the password in the JSON body.
2. While the promise is pending, the button reads "Signing in", is `aria-busy`, and a second click leaves `apiFetch` at one call.
3. Resolving calls `router.push('/')` and then `router.refresh()`.
4. Rejecting with `new ApiError(401, …)` shows "Email or password is incorrect.", doesn't navigate, and both inputs keep their values.
5. `ApiError(429)` shows the throttle message.
6. `new TypeError('fetch failed')` shows "Couldn't reach the server. Please try again."

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
