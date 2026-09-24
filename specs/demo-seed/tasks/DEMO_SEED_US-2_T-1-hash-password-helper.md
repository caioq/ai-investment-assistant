# DEMO_SEED_US-2_T-1: Export `hashPassword()` from auth

**Story:** [../stories/US-2-demo-account.md](../stories/US-2-demo-account.md)
**Status:** Done
**GitHub Issue:** #361 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create `apps/api/src/auth/password.ts`, exporting `BCRYPT_SALT_ROUNDS = 10` and `hashPassword(password: string): Promise<string>` (a wrapper around `bcrypt.hash`). Move the constant out of `auth.service.ts` and change `AuthService.register` to call `hashPassword`, so the seed and registration can never disagree on the salt rounds. Nothing else changes.

**Test:** `apps/api/src/auth/password.spec.ts`:
1. `hashPassword('Demo1234!')` returns a string for which `bcrypt.compare('Demo1234!', hash)` is `true`, and `bcrypt.compare('wrong', hash)` is `false`.
2. `bcrypt.getRounds(hash) === BCRYPT_SALT_ROUNDS`.

In addition, the existing `apps/api/src/auth/auth.service.spec.ts` and `apps/api/test/auth.e2e-spec.ts` still pass unchanged.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
