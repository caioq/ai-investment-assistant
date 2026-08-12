# PORTFOLIO_US-1_T-3: PATCH /portfolio/holdings/:id

**Story:** [../stories/US-1-manage-holdings.md](../stories/US-1-manage-holdings.md)
**Status:** Done
**GitHub Issue:** #101 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-1_T-1

Add `PATCH /portfolio/holdings/:id` taking `{ quantity?, avgPrice? }` (both optional, both positive numbers when present — a `class-validator` DTO behind the global `ValidationPipe`) and returning the updated `Holding`.

**Scope the update on `(id, userId)` together, not on `id` alone.** A bare `prisma.holding.update({ where: { id } })` lets any authenticated user modify any holding whose id they can name — the guard proves *who* the caller is, it doesn't prove the row is theirs. Filter on both and return `404` (not `403`) when nothing matches, so the response can't be used to probe which ids exist. This is the concrete instance of spec AC-7 that `PORTFOLIO_US-1_T-5` then asserts end-to-end.

Return `404` for an unknown id as well — same code path, no special case.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie and a seeded holding:

1. `PATCH` with `{ quantity: 250 }` returns `200`, the body shows `quantity: 250`, and `avgPrice` is **unchanged** — a partial update must not null out the field it wasn't given, which is what happens if the handler passes the whole DTO through with `undefined`s.
2. `PATCH` with `{ avgPrice: 41.5 }` updates only `avgPrice`.
3. `PATCH` against a well-formed but non-existent UUID returns `404`.
4. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s — note case 3 also expects `404`, so assert cases 1 and 2 go green to prove the route is genuinely wired rather than still missing).

**Done when:** the test above passes — case 1 in particular, since "update both fields from the DTO" passes a naive read of the spec and silently wipes `avgPrice` on a quantity-only edit.
