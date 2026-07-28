# US-1: Registration

**Status:** Ready
**Traces to:** spec Goal "Email/password registration and login" (registration half) / AC "Registering with an email already in use returns a 4xx error, not a duplicate user." / AC "Passwords are never returned in any API response and never logged." (in `../spec.md`)

As a new user, I want to register with an email and password, so that I have an account to store my portfolio data under.

## Tasks

- [x] [T-1: User Prisma model + migration](../tasks/AUTH_US-1_T-1-user-prisma-model.md)
- [x] [T-2: AuthService.register](../tasks/AUTH_US-1_T-2-register-service.md)
- [x] [T-3: POST /auth/register endpoint](../tasks/AUTH_US-1_T-3-register-endpoint.md)

## Notes

Registration is the first place a JWT is signed and the `access_token` cookie is set (per the spec's API Contract, `POST /auth/register` also sets the cookie, not just `/login`) — T-3 establishes the `JwtModule` config and the sign+set-cookie logic that [US-2](./US-2-login.md)'s login endpoint reuses.

Every response shape in this story (register's `{ id, email, name }`) must omit `passwordHash` — assert this explicitly in T-3's test, not just visually inspect it. The spec's "never logged" requirement for passwords has no dedicated automated test here (hard to assert "absence of a log line" meaningfully); enforce it by construction — never pass the full `User` record (with `passwordHash`) to a `Logger` call, only pick the fields you need.
