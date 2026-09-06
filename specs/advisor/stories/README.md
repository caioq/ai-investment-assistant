# AI Portfolio Advisor — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-upload-report.md) | Give the advisor the research house's report | Done | T-1..T-2 in `../tasks/` |
| [US-2](./US-2-generate-analysis.md) | Generate a portfolio analysis | Ready | T-1..T-4 in `../tasks/` |
| [US-3](./US-3-latest-analysis.md) | See my last analysis without paying for it again | Ready | T-1 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/ADVISOR_SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`ADVISOR_SHARED_T-1-advisor-schema.md`](../tasks/ADVISOR_SHARED_T-1-advisor-schema.md) — `AdvisorReport` + `AdvisorAnalysis` models, their `User` back-relations, and the `@@index([userId, createdAt])` US-3's query depends on. Shared by US-1, US-2, US-3.
- [`ADVISOR_SHARED_T-2-advisor-module-guard.md`](../tasks/ADVISOR_SHARED_T-2-advisor-module-guard.md) — `AdvisorModule`/`Service`/`Controller` wiring with the shared `AuthGuard`, plus the `PortfolioModule`/`RecommendedPortfoliosModule` imports US-2 reads through. Shared by US-1, US-2, US-3.

## Start here

`ADVISOR_SHARED_T-1` is the only task with no dependencies — everything else waits on it, then on `SHARED_T-2`. After those two, **US-1 and US-2 are independent** and can run in parallel: a report is optional context for an analysis, not a prerequisite, so `US-1_T-1` and `US-2_T-1` can be picked up at the same time.

`US-2_T-2` (the prompt) is the task with the real substance in this module. Budget accordingly — the API call in `T-3` is thin once the prompt exists.

## Decisions this pass had to make

- **`getLatestPerWallet` has to be widened, and that touches a `Done` module.** It returns `include: { holdings: true }` with no `asset` relation, so a recommended holding arrives with no `sector`, `riskRating` or `currentPrice`. Two spec ACs — the unheld-recommended-ticker one and the `currentPrice > limitPrice` flag — are **unsatisfiable** as things stand. `ADVISOR_US-2_T-2` changes it to `include: { holdings: { include: { asset: true } } }`. One line plus a type widening, but it means that task's PR touches `recommended-portfolios/`; called out here so a reviewer expects it rather than reading it as scope creep.
- **The Anthropic client goes behind a DI token**, following `market-data`'s `PRICE_PROVIDER` precedent. Not a style choice: the spec's "verify via a mocked client asserting call count" AC (US-3) is inexpressible without it, and no test in this repo may make a real, paid API call.
- **Exact SDK call shapes are deferred to the `claude-api` skill, not written into these tasks.** The spec pins the semantics — model, `thinking: { type: "disabled" }`, `output_config.format` with a JSON Schema — and the tasks instruct the implementer to load that skill for the current TypeScript bindings. This API drifted during 2025–2026 (`output_config.format` supersedes an older `output_format`; the thinking-config shape changed across model generations), so a signature transcribed into a task file now would be a plausible-looking source of a wrong implementation later.

- **One spec AC is only half-automatable.** *"When at least one held ticker's `currentPrice` exceeds its `limitPrice` … the generated `risks[]` or `recommendations[]` reflects that"* is model output, and the spec itself says "spot-checked against a fixture, not asserted verbatim". Every test here stubs the Anthropic client, so no test can assert what the model *said*. `US-2_T-2` therefore asserts the deterministic half — that both numbers reach the prompt for that ticker — and the output half stays a manual check. Recorded so the gap is a known choice rather than something that looks covered and isn't.

## Flagged for you, outside this pass's scope

- **The spec pins `claude-sonnet-5` with `thinking: { type: "disabled" }`.** That's a defensible cost/latency choice for a button, and it's what these tasks implement. Worth revisiting in a `/spec advisor` pass rather than here: `claude-opus-5` is this repo's default for new work, and adaptive thinking is the current recommendation for genuinely analytical tasks — which a strengths/risks/recommendations read on a 31-position portfolio arguably is. Changing it later is a one-line edit plus a re-run, so nothing here forecloses it.
- **Two dependencies are missing from `apps/api`**: `@anthropic-ai/sdk` and `pdf-parse`. Added by `US-2_T-1` and `US-1_T-1` respectively; noted here because a `pnpm install` alone won't produce them.
- **`apps/api` has no `ConfigModule`/dotenv loader.** `ANTHROPIC_API_KEY` is read straight from `process.env`, like `JWT_SECRET` in `auth.module.ts`. A local run therefore needs it exported, not just present in `apps/api/.env` — the same trap that makes `pnpm --filter api test:e2e` fail without `JWT_SECRET` set.

## Out of scope for this pass

- **Multi-turn chat**, and **auto-re-running the analysis when holdings or prices change** — both explicit spec Non-Goals. "Ask Another Question" is frontend state, not an endpoint.
- **Numeric extraction from the report PDF** — an explicit Non-Goal; tickers and limit prices come from [recommended-portfolios](../../recommended-portfolios/spec.md)'s CSV. This module's PDF path stores prose only.
- **Any UI.** The module ends at the JSON API; the panel that renders it belongs to [dashboard-ui](../../dashboard-ui/spec.md).
