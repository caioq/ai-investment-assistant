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
| POST | `/auth/register` | `{ email, password, name }` | `{ id, email, name }` + sets `access_token` cookie | none |
| POST | `/auth/login` | `{ email, password }` | `{ id, email, name }` + sets `access_token` cookie | none |
| POST | `/auth/logout` | — | `204` + clears cookie | required |
| GET | `/auth/me` | — | `{ id, email, name }` | required |

**Amended by [auth-ui](../auth-ui/spec.md)** (implemented through auth-ui's tasks: `AUTH_UI_US-2_T-1` for the required name, `AUTH_UI_SHARED_T-5` for throttling):

- `POST /auth/register`: `name` is **required**. It's trimmed, and an absent or whitespace-only value returns `400`. `User.name` stays nullable in the schema, so accounts created before this change are unaffected, and `/auth/me` may still return `name: null` for them.
- `POST /auth/login` and `POST /auth/register` are **throttled per client IP** and return `429` once the limit is exceeded. The limit and window come from env: `AUTH_THROTTLE_LIMIT` (default `5`) and `AUTH_THROTTLE_TTL_MS` (default `60000`). Test and CI environments set a high limit, because the e2e suites register and log in many users from one IP.

## Behavior Notes

- Passwords hashed with `bcrypt` (10 rounds).
- JWT signed with `JWT_SECRET`, read via a custom `passport-jwt` extractor that pulls the token from the `access_token` cookie (not the `Authorization` header) using `cookie-parser`.
- Cookie flags: `httpOnly: true`, `sameSite: 'lax'`, `secure: isProd`.
- CORS configured with `{ origin: FRONTEND_URL, credentials: true }` so the browser sends the cookie cross-port in dev (`localhost:3000` ↔ `localhost:3001`).
- All other modules' controllers use a shared `AuthGuard` that resolves `req.user.id`; no endpoint outside `AuthModule` accepts a `userId` from the client.
- Throttling is **per IP only**, applied with `@nestjs/throttler` to the two unauthenticated auth endpoints and nowhere else. Per-account lockout and progressive delays are out of scope (see auth-ui Non-Goals). The login `401` stays the single generic `Invalid email or password` whether the email or the password was wrong.
- There is **no server-side minimum password length**; the 8-character minimum is enforced client-side only (auth-ui). This is a deliberate choice, recorded there.

## Acceptance Criteria

- [ ] Registering with an email already in use returns a 4xx error, not a duplicate user.
- [ ] Logging in with wrong credentials returns 401 and does not set a cookie.
- [ ] After login, `GET /auth/me` returns the current user using only the cookie (no bearer token).
- [ ] Hitting any protected endpoint (e.g. `GET /portfolio/holdings`) without the cookie returns 401.
- [ ] `POST /auth/logout` clears the cookie; a subsequent `GET /auth/me` returns 401.
- [ ] Passwords are never returned in any API response and never logged.
- [ ] (auth-ui) `POST /auth/register` with `name` missing or `"   "` returns 400 and creates no user; with `"  Ana  "` it stores `"Ana"`.
- [ ] (auth-ui) With default limits, the 6th `POST /auth/login` from the same IP within 60 s returns 429, whether the credentials are valid or not; after the window passes, login works again.
- [ ] (auth-ui) `GET /auth/me` and every other endpoint are not throttled.
