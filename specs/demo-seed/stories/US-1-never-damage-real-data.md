# US-1: The seed never damages real data

**Status:** Ready
**Traces to:** spec Goal "The seed can never run against a production database, and never overwrites data someone imported themselves" and "Safe to re-run"; ACs "Guard (unit tests)", "E2E, idempotency", "E2E, insert-only", "E2E, isolation" (in `../spec.md`)

As the **maintainer of a deployed instance**, I want the demo seed to refuse to run against a production or remote database, and to only ever add missing global rows, so that running the wrong command against the wrong `DATABASE_URL` can't wipe or rewrite imported assets, price history, benchmarks or another user's data.

## Tasks

- [x] [T-1: `assertSeedAllowed` environment guard](../tasks/DEMO_SEED_US-1_T-1-seed-guard.md)
- [ ] [T-2: Idempotency, insert-only and isolation e2e](../tasks/DEMO_SEED_US-1_T-2-safety-e2e.md)

## Notes

The guard (T-1) is written first and has no dependencies, so every later task can call it from `main()` from the start. T-2 is a test-only task: the insert-only behaviour itself is built in `DEMO_SEED_US-2_T-3`, and T-2 proves it against a real database once the whole seed exists.
