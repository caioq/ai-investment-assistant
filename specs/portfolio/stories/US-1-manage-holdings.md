# US-1: Manage my holdings

**Status:** Done
**Traces to:** spec Goal "Add holdings manually or via CSV upload." / Goal "Edit/remove holdings." / AC "Adding a holding for a ticker never seen before creates the `Asset` and the `Holding` in one request." / AC "Adding a holding for a ticker already held updates quantity/avgPrice rather than creating a duplicate row." / AC "Deleting a holding removes it from `GET /portfolio/holdings` and from subsequent allocation/summary calculations." / AC "A user can never read or modify another user's holdings." (in `../spec.md`)

As an investor, I want to record and adjust the B3 positions I hold, so the rest of the platform has real data to analyse instead of me re-entering it every session.

## Tasks

- [x] [T-1: POST /portfolio/holdings](../tasks/PORTFOLIO_US-1_T-1-create-holding.md)
- [x] [T-2: GET /portfolio/holdings](../tasks/PORTFOLIO_US-1_T-2-list-holdings.md)
- [x] [T-3: PATCH /portfolio/holdings/:id](../tasks/PORTFOLIO_US-1_T-3-update-holding.md)
- [x] [T-4: DELETE /portfolio/holdings/:id](../tasks/PORTFOLIO_US-1_T-4-delete-holding.md)
- [x] [T-5: cross-user isolation e2e](../tasks/PORTFOLIO_US-1_T-5-cross-user-isolation.md)

## Notes

**T-1 carries most of this story's weight.** Creating a holding is not a plain insert: the request takes a *ticker*, but `Holding` references an `Asset` by id, so the endpoint has to find-or-create the `Asset` first (spec AC-1: "creates the `Asset` and the `Holding` in one request"), then upsert the `Holding` on `@@unique([userId, assetId])` so re-adding a held ticker updates rather than duplicates (AC-2). Three of the module's ACs land in that one endpoint.

**T-5 exists because AC-7 is a security property, not a feature.** The spec asks for it to be "covered by an auth-guard test, not just manual check", and the failure it guards against is the classic one: an endpoint that reads `:id` from the path and trusts it, so user B can `PATCH`/`DELETE` user A's holding by guessing an id. `CONVENTIONS.md` → "Auth" states the rule (`req.user.id` only, never a client-supplied `userId`), but a rule with no test is a rule that erodes — so T-5 asserts it from the outside with two real sessions. UUIDv7 ids make guessing impractical, which is a mitigation, not the control.

Ordering is deliberate: T-1 before T-2 so the list endpoint has something real to return, and T-3/T-4 after both since their tests seed through the create path.
