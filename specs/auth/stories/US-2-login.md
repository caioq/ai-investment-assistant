# US-2: Login

**Status:** Done
**Traces to:** spec Goal "Email/password registration and login" (login half) / AC "Logging in with wrong credentials returns 401 and does not set a cookie." (in `../spec.md`)

As a registered user, I want to log in with my email and password, so that I get an authenticated session to access my own data.

## Tasks

- [x] [T-1: AuthService.validateUser + login](../tasks/AUTH_US-2_T-1-login-service.md)
- [x] [T-2: POST /auth/login endpoint](../tasks/AUTH_US-2_T-2-login-endpoint.md)

## Notes

Reuses the JWT signing + cookie-setting logic established in [AUTH_US-1_T-3](../tasks/AUTH_US-1_T-3-register-endpoint.md) — don't reimplement it, extract it to a shared `AuthService` method if it isn't already.

The full "login then read it back via a cookie" round trip (AC "After login, `GET /auth/me` returns the current user using only the cookie") isn't tested until [US-3](./US-3-guarded-session.md)'s `T-2`, since `/auth/me` doesn't exist yet at this point — this story's own test only covers login setting a valid cookie on success and rejecting bad credentials.
