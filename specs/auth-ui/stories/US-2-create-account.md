# US-2: Create an account with a name and password guidance

**Status:** Ready
**Traces to:** spec Goals "Fields … Name in Create account only, required", "an advisory password strength meter", "The backend changes this screen relies on: `name` required"; ACs under "Validation" (7-character password, whitespace name), "Password field and strength meter", "Submitting and errors" (Create account cases), "Creating an account … lands on `/`" (in `../spec.md`)

As a new user, I want to create an account with my name, an email and a password, with guidance on how strong my password is, so that I can start using the app with a sensible password.

## Tasks

- [ ] [T-1: Require a trimmed `name` on `POST /auth/register`](../tasks/AUTH_UI_US-2_T-1-register-requires-name.md)
- [ ] [T-2: `scorePassword` in `packages/shared`](../tasks/AUTH_UI_US-2_T-2-score-password.md)
- [ ] [T-3: `PasswordStrengthMeter` component and `--amber` token](../tasks/AUTH_UI_US-2_T-3-password-strength-meter.md)
- [ ] [T-4: `AuthScreen` Create account mode: fields, validation, submit, errors](../tasks/AUTH_UI_US-2_T-4-create-account-mode.md)
- [ ] [T-5: Serve `/register` from `AuthScreen` and retire `RegisterForm`](../tasks/AUTH_UI_US-2_T-5-register-route-and-retire-register-form.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/AUTH_UI_SHARED_T-1-is-valid-email.md), [SHARED_T-2](../tasks/AUTH_UI_SHARED_T-2-text-and-password-fields.md), [SHARED_T-3](../tasks/AUTH_UI_SHARED_T-3-button-navy-variant.md), [SHARED_T-4](../tasks/AUTH_UI_SHARED_T-4-auth-layout-and-brand-panel.md), [SHARED_T-5](../tasks/AUTH_UI_SHARED_T-5-auth-throttling.md), [SHARED_T-6](../tasks/AUTH_UI_SHARED_T-6-e2e-and-visual-baselines.md).

## Notes

- **Making `name` required breaks every existing caller that registers without one.** T-1 must update all of them in the same change:
  - the API e2e suites
  - the Playwright global setup and fixtures
- The 8-character minimum is client-side only (spec Non-Goal: no server-side minimum). The strength meter is advisory: a score-1 password of 8+ characters still submits.
- The 409 "Sign in instead" action needs mode switching, so it lives in US-3_T-2. T-4 renders only the 409 message itself.
