# AUTH_UI_US-2_T-4: `AuthScreen` Create account mode: fields, validation, submit, errors

**Story:** [../stories/US-2-create-account.md](../stories/US-2-create-account.md)
**Status:** Not Started
**GitHub Issue:** #284 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-1_T-2, AUTH_UI_US-2_T-3

Implement `startMode="signup"` in `apps/web/components/auth/AuthScreen.tsx`.

**Fields** (in DOM order):
1. a Name `TextField` (`autoComplete="name"`, placeholder `Ana Souza`)
2. Email
3. a `PasswordField` (`autoComplete="new-password"`, placeholder "At least 8 characters"), with `PasswordStrengthMeter` below it

Title and subtitle come from `AUTH_CONTENT.signup`.

**Validation** on submit, per spec → Validation:
- "Name is required." when `name.trim() === ""`
- the email rules from US-1_T-1
- "Password is required." when the password is empty
- "Use at least 8 characters." when it's under 8 characters

The meter never blocks submission.

**Submit:**
- A valid submit posts `{ email: email.trim(), password, name: name.trim() }` to `POST /auth/register`.
- While in flight, the label reads "Creating account", with the same loading state and re-entry guard as Sign in.
- On success: `router.push('/')`, then `router.refresh()`.

**Errors**, never clearing input:

| Failure | Message | Where |
|---|---|---|
| `ApiError` 409 | "This email is already registered." | on the Email field (the "Sign in instead" action is AUTH_UI_US-3_T-2) |
| 400 | "Check your details and try again." | form alert |
| 429 | the throttle message | form alert |
| anything else | "Couldn't reach the server. Please try again." | form alert |

**Test:** `apps/web/components/auth/AuthScreen.test.tsx` (extend):
1. `startMode="signup"` renders "Create your account" and the Name, Email and Password fields in that order, plus "Use 8+ characters".
2. Submitting name `"   "` shows "Name is required." and focuses Name.
3. A 7-character password shows "Use at least 8 characters." and never calls `apiFetch`.
4. Name `"  Ana "`, a valid email and `abcdefgh` (score 1, Weak) calls `apiFetch('/auth/register', …)` with body `{ email, password: 'abcdefgh', name: 'Ana' }`.
5. While pending, the button reads "Creating account" and a second click adds no second call.
6. `ApiError(409)` shows "This email is already registered." next to Email, with all values kept.
7. `ApiError(429)` shows the throttle message.
8. Success calls `router.push('/')`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
