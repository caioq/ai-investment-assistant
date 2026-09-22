# AUTH_UI_US-2_T-5: Serve `/register` from `AuthScreen` and retire `RegisterForm`

**Story:** [../stories/US-2-create-account.md](../stories/US-2-create-account.md)
**Status:** Not Started
**GitHub Issue:** #285 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_UI_US-2_T-4

Change `apps/web/app/(auth)/register/page.tsx` so it still calls `await redirectIfAuthenticated()` first and then renders only `<AuthScreen startMode="signup" />`. Delete `apps/web/components/auth/RegisterForm.tsx` and `RegisterForm.test.tsx`. Update CONVENTIONS.md → "Auth forms" so the `RegisterForm` 409 note refers to `AuthScreen`'s Create account mode.

**Test:** `apps/web/app/(auth)/register/page.test.tsx` (update the existing file):
1. With `redirectIfAuthenticated` mocked to resolve, the page renders "Create your account" and a Name field.
2. With it mocked to throw Next's redirect error, the form isn't rendered.

`grep -r "RegisterForm\|LoginForm" apps/web --include=*.tsx` must return nothing.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
