# US-3: Switch between Sign in and Create account without losing input

**Status:** Ready
**Traces to:** spec Goal "One screen with two modes … Switching modes happens on the client with no remount"; Behavior Notes → Mode switching; ACs "Clicking 'Create account' in the segmented control, or 'Create one' in the switch line, switches mode …" and the 409 "Sign in instead switches to Sign in with the email kept" row (in `../spec.md`)

As a visitor who picked the wrong form, I want to switch between Sign in and Create account without retyping my email and password, so that choosing the wrong mode costs me nothing.

## Tasks

- [ ] [T-1: Client-side mode switching in `AuthScreen`](../tasks/AUTH_UI_US-3_T-1-client-side-mode-switching.md)
- [ ] [T-2: "Sign in instead" action on a 409](../tasks/AUTH_UI_US-3_T-2-sign-in-instead-on-409.md)

Shared tasks this story relies on: [SHARED_T-4](../tasks/AUTH_UI_SHARED_T-4-auth-layout-and-brand-panel.md), [SHARED_T-6](../tasks/AUTH_UI_SHARED_T-6-e2e-and-visual-baselines.md).

## Notes

- **Switching must not remount `AuthScreen`.** The spec prescribes `window.history.replaceState`, not `router.replace`: `router.replace` navigates to the other `page.tsx`, which mounts a fresh `AuthScreen` and loses the typed values. The test asserts the observable result (URL updated, values kept).
- The password is never written to the URL or to storage when switching (spec → Security).
