# Auth UI — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-sign-in.md) | Sign in on the redesigned auth screen | Done | T-1..T-3 in `../tasks/` |
| [US-2](./US-2-create-account.md) | Create an account with a name and password guidance | Done | T-1..T-5 in `../tasks/` |
| [US-3](./US-3-switch-modes.md) | Switch between Sign in and Create account without losing input | Ready | T-1..T-2 in `../tasks/` |

Build order: the `SHARED` foundations (T-1..T-5) first, then US-1, US-2, US-3, then `SHARED_T-6` (end-to-end + visual) last. Each task's `**Depends on:**` field is authoritative.

## Cross-cutting tasks

| Task | Title | Shared by |
|---|---|---|
| [AUTH_UI_SHARED_T-1](../tasks/AUTH_UI_SHARED_T-1-is-valid-email.md) | `isValidEmail` in `packages/shared` | US-1, US-2 |
| [AUTH_UI_SHARED_T-2](../tasks/AUTH_UI_SHARED_T-2-text-and-password-fields.md) | `TextField` / `PasswordField` UI primitives | US-1, US-2 |
| [AUTH_UI_SHARED_T-3](../tasks/AUTH_UI_SHARED_T-3-button-navy-variant.md) | `Button` `navy` variant + reduced-motion spinner | US-1, US-2 |
| [AUTH_UI_SHARED_T-4](../tasks/AUTH_UI_SHARED_T-4-auth-layout-and-brand-panel.md) | Two-column `(auth)` layout, Fraunces, `BrandPanel` | US-1, US-2, US-3 |
| [AUTH_UI_SHARED_T-5](../tasks/AUTH_UI_SHARED_T-5-auth-throttling.md) | Per-IP throttling on `POST /auth/login` and `/auth/register` | US-1, US-2 |
| [AUTH_UI_SHARED_T-6](../tasks/AUTH_UI_SHARED_T-6-e2e-and-visual-baselines.md) | Playwright flows + `/login` and `/register` visual baselines | US-1, US-2, US-3 |

## Out of scope for this pass

Nothing from the spec's Goals was deferred. The spec's own Non-Goals (dark theme, forgot password, Terms consent, server-side password minimum, per-account lockout) get no stories.
