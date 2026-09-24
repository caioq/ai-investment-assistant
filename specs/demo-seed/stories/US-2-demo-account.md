# US-2: Log in to a fully populated demo account

**Status:** Ready
**Traces to:** spec Goals "Demo account", "Works offline", "Works without an Anthropic key"; ACs "Series (unit tests)", "Auth", "E2E against `db-test`" (in `../spec.md`)

As a **reviewer trying the app**, I want to log in as `demo@example.com` / `Demo1234!` and immediately see allocations, a year of performance vs. IBOVESPA and CDI, model wallets, a research report, an advisor analysis and import history, so that I can explore every feature without preparing four import files or an Anthropic API key.

## Tasks

- [ ] [T-1: Export `hashPassword()` from auth](../tasks/DEMO_SEED_US-2_T-1-hash-password-helper.md)
- [ ] [T-2: Deterministic price-series generator](../tasks/DEMO_SEED_US-2_T-2-series-generator.md)
- [ ] [T-3: `runSeed`: user, assets, holdings and history](../tasks/DEMO_SEED_US-2_T-3-seed-portfolio-and-history.md)
- [ ] [T-4: Seed wallets, report, analysis and import logs](../tasks/DEMO_SEED_US-2_T-4-seed-advisor-and-imports.md)

## Notes

T-1 and T-2 have no dependencies and can run in parallel with `DEMO_SEED_US-1_T-1`. T-3 is the core task. T-4 layers on top of it.
