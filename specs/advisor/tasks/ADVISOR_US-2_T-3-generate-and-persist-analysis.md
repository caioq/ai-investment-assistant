# ADVISOR_US-2_T-3: generate, validate and persist the analysis

**Story:** [../stories/US-2-generate-analysis.md](../stories/US-2-generate-analysis.md)
**Status:** Done
**GitHub Issue:** #189 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_US-2_T-1, ADVISOR_US-2_T-2

Add `AdvisorService.analyze(userId, advisorReportId?)`: send the `ADVISOR_US-2_T-2` prompt through the injected `ANTHROPIC_CLIENT`, validate the response, and persist an `AdvisorAnalysis`.

Request shape, from the spec's Behavior Notes: model `claude-sonnet-5`, `thinking: { type: "disabled" }`, and the output constrained by `output_config.format` with a JSON Schema declaring `score`, `summary`, `strengths[]`, `risks[]`, `recommendations[]` and `impactMetrics[{label,value}]` — all `required`, `additionalProperties: false`. **Load the `claude-api` skill before writing the call** and take the exact parameter shapes from it rather than from memory; `output_config.format` supersedes an older `output_format` parameter, and the thinking-config shape has changed across model generations.

Three behaviors the spec calls out, each with its own AC:

- **Validate before persisting, retry exactly once.** A response that fails schema validation is retried a single time; a second failure surfaces as an error. Never persist a malformed row, and never loop — an unbounded retry against a paid API is a way to spend real money on a bad prompt.
- **Clamp `score` to 0–10 in code.** JSON Schema structured output supports no `minimum`/`maximum`, so the prompt asks for the range and this clamp enforces it. A model returning `12` must persist as `10`, not be rejected.
- **Record provenance.** `model` stores the model id actually used (the spec calls it an audit field, and it is the only way to explain why two analyses of the same portfolio differ). `recommendedPortfolioIds` stores the ids of the `RecommendedPortfolio` snapshots that went into the prompt — not the wallet types, since a wallet's contents change with each upload and the ids are what pin *which* version was seen.

Always create a new row; never update an existing one. `GET /advisor/analysis/latest` reading the newest row is the whole caching design (US-3).

**Test:** `apps/api/test/advisor.e2e-spec.ts` (extending the existing suite; the Anthropic client stubbed via `.overrideProvider(ANTHROPIC_CLIENT)` on the `TestingModuleBuilder`, per `CONVENTIONS.md` → "Testing"): (1) a stub returning a valid payload persists an `AdvisorAnalysis` whose `Json` arrays round-trip and whose `model` records the model id; (2) a stub returning `score: 12` persists `score: 10`, and one returning `-3` persists `0`; (3) a stub returning a schema-invalid payload once then a valid one persists successfully and the stub was called **exactly twice**; (4) a stub returning invalid twice throws, persists **no** row, and was called exactly twice — never three times; (5) calling with no `advisorReportId` succeeds and persists `advisorReportId: null`; (6) `recommendedPortfolioIds` contains the ids of the wallets that were in the prompt. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
