# AUTH_US-2_T-1: AuthService.validateUser + login

**Story:** [../stories/US-2-login.md](../stories/US-2-login.md)
**Status:** Not Started
**GitHub Issue:** #39 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-1_T-2

Add `AuthService.validateUser(email, password)`: look up the `User` by `email` via `PrismaService`, compare `password` against `passwordHash` with `bcrypt.compare`, and throw `UnauthorizedException` if the email isn't found or the password doesn't match (same error either way — don't leak which one was wrong).

**Test:** `apps/api/src/auth/auth.service.spec.ts` (extends the file from `AUTH_US-1_T-2`) — unit test mocking `PrismaService`: asserts `validateUser()` returns the user (without `passwordHash`) when the email exists and the password matches; asserts it throws `UnauthorizedException` when the email doesn't exist, and throws the same `UnauthorizedException` when the email exists but the password doesn't match.

**Done when:** the test above passes.
