# Demo Seed — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-never-damage-real-data.md) | The seed never damages real data | Done | T-1..T-2 in `../tasks/` |
| [US-2](./US-2-demo-account.md) | Log in to a fully populated demo account | Done | T-1..T-4 in `../tasks/` |
| [US-3](./US-3-one-command-setup.md) | Set up the demo with one command | Done | T-1..T-2 in `../tasks/` |

## Cross-cutting tasks

None. Every task has a single owning story.

## Start here

`DEMO_SEED_US-1_T-1` (guard), `DEMO_SEED_US-2_T-1` (`hashPassword`) and `DEMO_SEED_US-2_T-2` (series) have no dependencies and can run in parallel. Then comes `US-2_T-3`, followed by `US-2_T-4`. After that, `US-1_T-2` (safety e2e) and `US-3_T-1` (commands) can run in parallel. `US-3_T-2` (docs and fresh-clone check) is last.

## Decisions this pass had to make

- **All database-backed seed tests live in one suite, `apps/api/test/demo-seed.e2e-spec.ts`.** Several tasks extend it. The seed writes global tables, so two seed suites running in parallel Jest workers would race each other.
- **`runSeed(prisma, fixtures)` takes its fixtures as a parameter.** The e2e suite passes a namespaced copy of `DEMO_FIXTURES` (unique email, prefixed tickers). `portfolio.e2e-spec.ts` deletes `PETR4`/`VALE3`/`ITUB4` and their holdings in its cleanup, so running the real tickers in the shared test database would flake. This was added to the spec's Behavior Notes.
- **The benchmark "only if missing" rule looks at the seeded date window, not the whole table.** `portfolio.e2e-spec.ts` writes IBOVESPA rows dated 2015, and an "any rows exist" check would make the seed skip benchmarks at random in the test database. Real synced history always covers the window, so the protection is the same. The spec was updated to match.
- **Unit tests for `guard.ts` and `series.ts` live under `apps/api/test/demo-seed/` as `*.e2e-spec.ts`.** The seed sits outside `src/`, where the unit Jest config (`rootDir: "src"`) doesn't reach, and CONVENTIONS.md → Testing requires specs under `test/` to use the e2e suffix even when they don't touch the database.
- **`hashPassword` lives in `apps/api/src/auth/password.ts`**, not on `AuthService`, so the seed can import it without pulling in Nest's DI graph.

## Out of scope for this pass

Sample import files (CSV/PDF fixtures for the import UI). The spec lists these under Non-Goals as a separate follow-up.
