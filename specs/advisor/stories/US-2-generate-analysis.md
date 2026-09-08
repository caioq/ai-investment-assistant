# US-2: Generate a portfolio analysis

**Status:** Ready
**Traces to:** spec Goals "Combine holdings + allocation + performance + the report text + the latest recommended portfolios into one prompt.", "Get back structured JSON … via Claude's structured output" / spec API Contract `POST /advisor/analyze` / spec ACs "`POST /advisor/analyze` without an `advisorReportId` still succeeds", "The JSON returned by Claude validates against the declared schema … retried once, then surfaced as an error", "`score` … is always between 0 and 10 inclusive", "When at least one held ticker's `currentPrice` exceeds its `limitPrice` … the generated `risks[]` or `recommendations[]` reflects that", "The prompt built for a portfolio whose assets are entirely unclassified … contains no `undefined`/`\"null\"` string artifacts", "A recommended wallet holding a ticker the user does **not** hold still carries that ticker's `sector` and `riskRating` in the prompt" (in `../spec.md`)

As someone holding thirty-odd positions, I want one button that reads my portfolio against my research house's views and tells me its strengths, risks and what to do about them, so I get an analyst's read without hiring an analyst.

## Tasks

- [x] [T-1: injectable Anthropic client](../tasks/ADVISOR_US-2_T-1-anthropic-client-provider.md)
- [x] [T-2: build the analysis prompt](../tasks/ADVISOR_US-2_T-2-build-analysis-prompt.md)
- [x] [T-3: generate, validate and persist the analysis](../tasks/ADVISOR_US-2_T-3-generate-and-persist-analysis.md)
- [ ] [T-4: POST /advisor/analyze](../tasks/ADVISOR_US-2_T-4-analyze-endpoint.md)

## Notes

**The prompt is where this story's real work is, not the API call.** T-2 is split out and unit-tested against fixtures precisely because it's the part with logic: three input blocks assembled from three other modules, with every classification field optionally `null`. The API call itself (T-3) is thin once the prompt exists.

**`getLatestPerWallet` currently cannot satisfy one of the spec's ACs.** It returns `include: { holdings: true }` — no `asset` relation — so a recommended holding arrives with no `sector`/`riskRating`/`currentPrice`. The AC "a recommended wallet holding a ticker the user does not hold still carries that ticker's `sector` and `riskRating`" is unsatisfiable as things stand, and so is the `currentPrice > limitPrice` flag. T-2 widens that include. It is a one-line change to a `Done` module, called out here because it makes this story's PR touch `recommended-portfolios/` and a reviewer should expect that rather than treat it as scope creep.

**Never call the real API in a test.** T-1 exists to put the client behind a DI token so every downstream test injects a stub, following the `PRICE_PROVIDER` precedent in `market-data`. The spec's "verify via a mocked client asserting call count" AC is only expressible if the client is injectable.

**Retry once, then fail loudly.** The spec is explicit that a schema-invalid response is retried exactly once and then surfaced as an error — not persisted malformed, and not retried indefinitely. `score` is separately clamped in code because JSON Schema structured output has no `minimum`/`maximum`.
