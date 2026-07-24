# AI Portfolio Advisor

**Status:** Approved
**Depends on:** [portfolio](../portfolio/spec.md), [market-data](../market-data/spec.md), [recommended-portfolios](../recommended-portfolios/spec.md)

## Problem

The user wants a single button that produces an expert-style read on their portfolio — strengths, risks, recommendations — grounded in three things: what they actually hold, the research house's free-text commentary, and the research house's structured model portfolios (with limit prices). Without structured output, this becomes an unreliable chat transcript instead of a UI panel the dashboard can render.

## Goals

- Upload and extract text from a PDF (or accept pasted text) as the free-text recommendation report.
- Combine holdings + allocation + performance + the report text + the latest recommended portfolios into one prompt.
- Get back structured JSON (score, summary, strengths, risks, recommendations, impact metrics) via Claude's structured output, not free-form text that needs fragile parsing.
- Cache the result — regenerating costs API money and shouldn't happen on every page load.

## Non-Goals

- Multi-turn chat with the advisor — "Ask Another Question" resets the panel to idle for a fresh generation, it doesn't open a conversation thread.
- Automatically re-running the analysis when holdings or prices change — it's user-triggered only.
- Any numeric extraction from the report PDF (tickers/prices in the report's own tables) — that's what [recommended-portfolios](../recommended-portfolios/spec.md)'s CSV upload is for; this module's PDF path is for the report's prose only.

## Data Model

```prisma
model AdvisorReport {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  sourceName String?
  fileName   String?
  rawText    String   @db.Text
  uploadedAt DateTime @default(now())
}

model AdvisorAnalysis {
  id                    String          @id @default(cuid())
  userId                String
  user                  User            @relation(fields: [userId], references: [id])
  advisorReportId       String?
  advisorReport         AdvisorReport?  @relation(fields: [advisorReportId], references: [id])
  recommendedPortfolioIds Json          // string[] — which RecommendedPortfolio snapshots were in the prompt

  score           Float
  summary         String   @db.Text
  strengths       Json     // string[]
  risks           Json     // string[]
  recommendations Json     // string[]
  impactMetrics   Json     // { label: string, value: string }[]

  model     String   // which Claude model generated this, for audit
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

## API Contract

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/advisor/reports/upload` | multipart PDF, or `{ sourceName?, text }` | created `AdvisorReport` |
| POST | `/advisor/analyze` | `{ advisorReportId? }` | created `AdvisorAnalysis` |
| GET | `/advisor/analysis/latest` | — | most recent `AdvisorAnalysis` for the user, or `404` if none exists yet |

## Behavior Notes

- **Model:** `claude-sonnet-5` (structured-output support, good cost/quality fit for a classification-and-synthesis task). `claude-opus-4-8` is a drop-in upgrade if quality needs to beat cost.
- **Thinking disabled** (`thinking: { type: "disabled" }`) — keeps the "Generate Portfolio Analysis" button responsive.
- **Prompt** has three input blocks:
  1. User's portfolio as JSON: holdings (ticker, sector, investmentStyle, riskRating, quantity, avgPrice, current value), allocation by sector/stock/style/rating, performance metrics.
  2. `AdvisorReport.rawText` if `advisorReportId` was passed (truncated to ~15k chars).
  3. The latest `RecommendedPortfolio` per wallet type (from [recommended-portfolios](../recommended-portfolios/spec.md)) as JSON: `{walletType, effectiveDate, holdings: [{ticker, targetWeightPct, limitPrice}]}` — lets the model compare actual vs. suggested allocation and flag holdings where `Asset.currentPrice > limitPrice`.
- **Output** is constrained via `output_config.format` (JSON Schema): `score`, `summary`, `strengths[]`, `risks[]`, `recommendations[]`, `impactMetrics[{label,value}]`, all `required`, `additionalProperties: false`. JSON Schema structured output doesn't support `minimum`/`maximum`, so the 0–10 `score` range is enforced by prompt instruction plus a `clamp()` in code after the response.
- **PDF extraction:** `pdf-parse` (multer memory storage → buffer → text) → `AdvisorReport.rawText`. Pasted text skips this step.
- **Caching:** `POST /advisor/analyze` always creates a new `AdvisorAnalysis` row (never overwrites); `GET /advisor/analysis/latest` is what the dashboard calls on load, so a page refresh doesn't trigger a paid API call. The frontend's "Ask Another Question" button just resets local UI state to `idle`; it doesn't call `/advisor/analyze` until the user clicks "Generate" again.

## Acceptance Criteria

- [ ] Uploading a valid PDF report results in a non-empty `AdvisorReport.rawText`.
- [ ] Uploading a corrupt/invalid PDF returns a clear 4xx error, not a 500 or a silently empty `rawText`.
- [ ] `POST /advisor/analyze` without an `advisorReportId` still succeeds (report is optional context).
- [ ] The JSON returned by Claude validates against the declared schema on every field before being persisted; a response that fails validation is retried once, then surfaced as an error rather than persisted malformed.
- [ ] `score` in the persisted `AdvisorAnalysis` is always between 0 and 10 inclusive, even if the model returns something outside that range.
- [ ] `GET /advisor/analysis/latest` after a page reload returns the same analysis without a new call to the Claude API (verify via a mocked client asserting call count).
- [ ] When at least one held ticker's `currentPrice` exceeds its `limitPrice` in a recommended wallet, the generated `risks[]` or `recommendations[]` reflects that (spot-checked against a fixture, not asserted verbatim since it's model output).
