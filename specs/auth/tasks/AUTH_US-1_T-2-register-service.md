# AUTH_US-1_T-2: AuthService.register

**Story:** [../stories/US-1-registration.md](../stories/US-1-registration.md)
**Status:** Done
**GitHub Issue:** #37 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-1_T-1, AUTH_SHARED_T-1

Scaffold the `auth` module (`apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `dto/`) per `CONVENTIONS.md` → "Module structure". Implement `AuthService.register(email, password, name?)`: hash the password with `bcrypt` at 10 rounds (per spec Behavior Notes), create the `User` via `PrismaService`, and throw a `ConflictException` if a `User` with that `email` already exists (checked via Prisma's unique constraint violation, not a separate pre-check query, to avoid a race).

**Test:** `apps/api/src/auth/auth.service.spec.ts` — unit test mocking `PrismaService` (per `CONVENTIONS.md` → "Testing"): asserts `register()` calls `prisma.user.create` with a `passwordHash` that is not the plaintext password and is a valid bcrypt hash (`bcrypt.compare(password, passwordHash)` resolves `true`); and asserts `register()` throws `ConflictException` (not a generic 500) when Prisma rejects with a unique-constraint error (`P2002`) on `email`.

**Done when:** the test above passes.
