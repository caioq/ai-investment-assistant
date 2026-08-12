# PORTFOLIO_US-1_T-5: cross-user isolation e2e

**Story:** [../stories/US-1-manage-holdings.md](../stories/US-1-manage-holdings.md)
**Status:** Done
**GitHub Issue:** #103 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-1_T-1, PORTFOLIO_US-1_T-2, PORTFOLIO_US-1_T-3, PORTFOLIO_US-1_T-4

Prove spec AC-7 — *"A user can never read or modify another user's holdings (covered by an auth-guard test, not just manual check)"* — from the outside, with two real sessions rather than by inspecting the query code.

This is a **test-only task**; `PORTFOLIO_US-1_T-3` and `T-4` already specify `(id, userId)`-scoped queries. It exists separately because the property it protects is a security invariant that every future endpoint must also satisfy, and because the natural implementation mistake (`where: { id }`) passes every single-user test in the suite. A reviewer reading one handler can't see the invariant; this test can.

If the tests below pass without any production change, that's a **valid green** — the isolation was already correct and is now pinned. Say so rather than manufacturing a change to justify the task.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — register and log in **two** distinct users (A and B, distinct emails), and have A create a holding. Then, using **B's** cookie throughout:

1. `GET /portfolio/holdings` returns `200` with `[]` — B sees none of A's rows, and the response is an empty list rather than an error, so a leak shows up as extra data rather than a different status code.
2. `PATCH /portfolio/holdings/{A's holding id}` with `{ quantity: 999 }` returns `404`, and re-reading as A shows the original quantity **unchanged** — asserting the database, not just the status, since a handler could return `404` after having already written.
3. `DELETE /portfolio/holdings/{A's holding id}` returns `404`, and A's holding still exists.

The `404`s (rather than `403`) are deliberate and asserted as such: a `403` would confirm to B that the id exists, turning the endpoint into an existence oracle.

Keep both users' emails suite-scoped and clean them up in `afterEach` with a `where` filter, per `CONVENTIONS.md` → "Testing" — e2e suites run in parallel against one Postgres and an unscoped `user.deleteMany()` would delete rows out from under another suite mid-run.

Confirm red first: temporarily change `PATCH`'s query to `where: { id }` alone and watch case 2 fail with a `200` and a mutated row — that demonstrates the test actually detects the vulnerability rather than passing vacuously. Revert, then confirm green.

**Done when:** all three cases pass, and the red-first check above has been performed — a test that would pass even with the vulnerability present provides no protection, and this is the one task where that failure mode is invisible in the final diff.
