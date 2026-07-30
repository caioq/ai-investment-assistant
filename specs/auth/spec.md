# Auth

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md)

## Problem

The platform needs real, multi-user authentication (not a mocked/single-user shortcut) so the app can be deployed and used safely, and so the data model already supports more than one user without rework.

## Goals

- Email/password registration and login.
- Session persistence via a JWT stored in an httpOnly cookie (not accessible to client-side JS).
- Every other module's endpoints are guarded and scoped to the authenticated user.

## Non-Goals

- OAuth / social login.
- Password reset flow (can be added later; for a personal project, a manual DB fix is an acceptable stopgap for v1).
- Roles/permissions — every user has the same capabilities over their own data.

## Data Model

```prisma
model User {
  id           String   @id @default(uuid(7)) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

`id` is a UUIDv7 (time-ordered, non-enumerable), stored as a native Postgres `uuid` column — not a `cuid()`/`TEXT` id or an autoincrementing integer. Model field names stay camelCase (matching the rest of the TS stack); columns are `snake_case` via `@map`/`@@map`, matching idiomatic Postgres and avoiding the unquoted-identifier case-folding footgun. See `CONVENTIONS.md` → "Prisma models" for the repo-wide rationale — this is the first model in the repo, and every later model follows the same two patterns.

## API Contract

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name? }` | `{ id, email, name }` + sets `access_token` cookie | none |
| POST | `/auth/login` | `{ email, password }` | `{ id, email, name }` + sets `access_token` cookie | none |
| POST | `/auth/logout` | — | `204` + clears cookie | required |
| GET | `/auth/me` | — | `{ id, email, name }` | required |

## Behavior Notes

- Passwords hashed with `bcrypt` (10 rounds).
- JWT signed with `JWT_SECRET`, read via a custom `passport-jwt` extractor that pulls the token from the `access_token` cookie (not the `Authorization` header) using `cookie-parser`.
- Cookie flags: `httpOnly: true`, `sameSite: 'lax'`, `secure: isProd`.
- CORS configured with `{ origin: FRONTEND_URL, credentials: true }` so the browser sends the cookie cross-port in dev (`localhost:3000` ↔ `localhost:3001`).
- All other modules' controllers use a shared `AuthGuard` that resolves `req.user.id`; no endpoint outside `AuthModule` accepts a `userId` from the client.

## Acceptance Criteria

- [ ] Registering with an email already in use returns a 4xx error, not a duplicate user.
- [ ] Logging in with wrong credentials returns 401 and does not set a cookie.
- [ ] After login, `GET /auth/me` returns the current user using only the cookie (no bearer token).
- [ ] Hitting any protected endpoint (e.g. `GET /portfolio/holdings`) without the cookie returns 401.
- [ ] `POST /auth/logout` clears the cookie; a subsequent `GET /auth/me` returns 401.
- [ ] Passwords are never returned in any API response and never logged.
