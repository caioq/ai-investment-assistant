# US-3: Read the current wallet per type

**Status:** Ready
**Traces to:** spec Goal "Expose the latest snapshot per wallet type for the Advisor to consume." / AC "…`GET .../latest` returns only the newer one for that wallet." / AC "Two uploads … with the same `effectiveDate` both persist, and `GET .../latest` returns the more recently uploaded one." / AC "`GET .../latest` returns at most one entry per `walletType`, even after multiple uploads across all three types, and omits a wallet type never uploaded." (in `../spec.md`)

As the AI Advisor, I want the current model portfolio for each wallet type in one call, so I can compare the user's holdings against today's recommendations without knowing anything about how versions are stored.

## Tasks

- [ ] [T-1: GET /advisor/recommended-portfolios/latest](../tasks/RECOMMENDED_PORTFOLIOS_US-3_T-1-latest-endpoint.md)

## Notes

One task: this is a single read whose entire difficulty is the *selection*. Splitting the query from the endpoint would produce a service-layer unit test asserting the shape of a Prisma call rather than the behaviour anyone cares about, so T-1's test seeds several versions across all three wallet types and asserts what actually comes back.

**Two ways to get the selection wrong, both of which look right in a single-wallet test:**

- *Ordering globally and taking the first three.* When one wallet has three versions and the others have none, that returns three snapshots of the same wallet. The response is one entry **per type**, capped at three — not "the three most recent overall".
- *Ignoring the tie-break.* `effectiveDate` defaults to today and history is deliberately additive with no unique constraint, so two same-day uploads are easy to produce — and then "most recent `effectiveDate`" is whichever row Postgres happens to hand back, which can differ between two identical requests. The spec settles it: `uploadedAt` descending, so a same-day correction wins.

A wallet never uploaded is simply **absent** from the response, and a user with nothing uploaded gets `[]` rather than a `404` — "no recommendations yet" is a normal state for a new account, and a `404` would make the Advisor treat it as an error.
