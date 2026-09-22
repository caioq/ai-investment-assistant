# US-1: Sign in on the redesigned auth screen

**Status:** Ready
**Traces to:** spec Goals "One screen with two modes", "Client-side validation on submit", "Submit loading state", "Explicit handling for each server and network failure"; ACs under "Validation" (Sign in cases), "Submitting and errors" (401, 429, network), "Signing in with the fixture user lands on `/`", "An authenticated visit to `/login` … redirects to `/`" (in `../spec.md`)

As a returning user, I want to sign in on a clear, designed screen that tells me exactly what's wrong when something fails, so that I get to my portfolio without guessing why a sign-in didn't work.

## Tasks

- [ ] [T-1: `AuthScreen` Sign in form and client validation](../tasks/AUTH_UI_US-1_T-1-sign-in-form-validation.md)
- [ ] [T-2: Sign in submit, loading state, and error mapping](../tasks/AUTH_UI_US-1_T-2-sign-in-submit-and-errors.md)
- [ ] [T-3: Serve `/login` from `AuthScreen` and retire `LoginForm`](../tasks/AUTH_UI_US-1_T-3-login-route-and-retire-login-form.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/AUTH_UI_SHARED_T-1-is-valid-email.md), [SHARED_T-2](../tasks/AUTH_UI_SHARED_T-2-text-and-password-fields.md), [SHARED_T-3](../tasks/AUTH_UI_SHARED_T-3-button-navy-variant.md), [SHARED_T-4](../tasks/AUTH_UI_SHARED_T-4-auth-layout-and-brand-panel.md), [SHARED_T-5](../tasks/AUTH_UI_SHARED_T-5-auth-throttling.md), [SHARED_T-6](../tasks/AUTH_UI_SHARED_T-6-e2e-and-visual-baselines.md).

## Notes

- Until US-3 lands, the bottom switch line ("Don't have an account? **Create one**") is a plain link to `/register`. US-3_T-1 turns it into a client-side mode switch.
- The login `401` stays one generic message. It must never distinguish an unknown email from a wrong password (spec → Security).
