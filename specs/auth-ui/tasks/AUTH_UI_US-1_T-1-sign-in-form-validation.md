# AUTH_UI_US-1_T-1: `AuthScreen` Sign in form and client validation

**Story:** [../stories/US-1-sign-in.md](../stories/US-1-sign-in.md)
**Status:** Not Started
**GitHub Issue:** #278 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_SHARED_T-1, AUTH_UI_SHARED_T-2, AUTH_UI_SHARED_T-4

Create `apps/web/components/auth/AuthScreen.tsx` (`'use client'`) with a `startMode: 'signin' | 'signup'` prop. This task implements only `signin`. It renders:
- `BrandPanel` for the current mode
- the form column:
  - a two-button segmented control, "Sign in" / "Create account" (each a `<button>` with `aria-pressed`)
  - the form title "Welcome back" as an `h1` with `tabIndex={-1}`, using `--font-fraunces`
  - the subtitle
  - an Email `TextField` (`autoComplete="email"`, placeholder `you@example.com`)
  - a `PasswordField` (`autoComplete="current-password"`, placeholder "Enter your password")
  - the submit button
  - the switch line "Don't have an account? **Create one**", which links to `/register` until AUTH_UI_US-3_T-1

On submit, validate with the rules in spec → Behavior Notes → Validation:
- empty email: "Email is required."
- `!isValidEmail(email.trim())`: "Enter a valid email address."
- empty password: "Password is required."

If anything fails, send nothing and focus the first invalid field in DOM order. Errors show only after the first submit; after that, an errored field re-validates on change. Also announce field errors through one `aria-live="polite"` region.

**Test:** `apps/web/components/auth/AuthScreen.test.tsx` (Vitest + RTL; mock `next/navigation` and the api client with `vi.mock`/`vi.hoisted`, per CONVENTIONS.md → "Component conventions"):
1. `startMode="signin"` renders "Welcome back", `getByLabelText('Email')` and `getByLabelText('Password', { exact: true })`, and no Name field.
2. Before any submit, no error text is present.
3. Submitting empty shows "Email is required." and "Password is required.", leaves `document.activeElement` on the Email input, and never calls `apiFetch`.
4. Typing `ana@example.com` after that clears the email error without another submit.
5. Submitting `ana@` shows "Enter a valid email address."

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
