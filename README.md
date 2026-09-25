# AI Investment Assistant — HowToo take-home

> This branch (`howtoo-take-home`) is the submission snapshot. It is identical to `main` except for this README. The project's own README, with full docs, is on [`main`](https://github.com/caioq/ai-investment-assistant/blob/main/README.md).

## Quick start

**Requirements:**

- **Node 22.12 or newer (22 LTS recommended)**
- **[pnpm](https://pnpm.io) 9**, pinned in `package.json` → `packageManager`.
- **Docker**, for Postgres.

```bash
git clone -b howtoo-take-home https://github.com/caioq/ai-investment-assistant.git
cd ai-investment-assistant
pnpm bootstrap:demo && pnpm dev
```

Open http://localhost:3000 and log in with:

| Email              | Password    |
| ------------------ | ----------- |
| `demo@example.com` | `Demo1234!` |

`pnpm bootstrap:demo` installs dependencies, starts Postgres in Docker, creates `apps/api/.env` (with a random local `JWT_SECRET`), runs the migrations, generates the Prisma client, builds the shared package and seeds the demo account. The demo account comes with holdings, allocation on every dimension, a year of performance history against Ibovespa and CDI, three model wallets, a research report, a pre-generated AI analysis and import history. **No API key is needed to explore it.**

To generate a _new_ analysis with Claude, set `ANTHROPIC_API_KEY` in `apps/api/.env` and restart `pnpm dev`.

## What I built and why

I live in Australia and invest in B3 (Brazilian) stocks, so the market is open while I'm asleep. I also subscribe to an equity research house that publishes a written report and model portfolios with ceiling prices and buy/neutral/sell calls. Checking all of that against my own holdings by hand was slow and easy to get wrong, so I built one place that does it for me.

This app brings the three inputs together:

1. **My holdings**, imported from CSV.
2. **The research house's report** (PDF), aligned with my investment profile and strategy.
3. **Recommended portfolios**: Dividends, Overall Recommended and Small Caps, each with ceiling prices and buy/neutral/sell calls.

It shows allocation by stock, sector, investment style and risk rating, and performance over time against Ibovespa and CDI (Brazilian benchmarks). Prices are refreshed every weekday after B3 market closes. An **AI Portfolio Advisor** (Claude) reads all three inputs and returns a structured analysis: a score, strengths, risks, and recommendations for what to do next.

I used AI agents to build it faster, following a spec-driven, test-first workflow that's explained in [`WORKFLOW.md`](WORKFLOW.md).

**Stack:** Next.js (App Router) · NestJS · Postgres with Prisma · Claude API · Yahoo Finance and Central Bank of Brazil (SGS) for market data · pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`).

## What I'd do with more time

**AI and product**

- **Advisor evals.** A fixed set of test portfolios with expected findings (over-concentration, a holding above its ceiling price, an ignored sell call), checked with deterministic assertions on the structured output, plus an LLM-as-judge to review each analysis against a short checklist: does it stick to the data provided, without inventing numbers or calls, and are its recommendations specific enough to act on? Run on every prompt or model change. Today prompt quality is judged by eye.
- **A more assertive, safer advisor:**
  - a "past performance does not guarantee future results" disclaimer
  - explicit concentration thresholds per stock and per sector
  - a target number of assets per investor profile, checked before recommending _new_ positions
  - rank what to buy by margin of safety (ceiling price vs. current price, computed in code rather than left to the model), and name which sector is under-weighted
  - pass the research house's buy/neutral/sell call and margin of safety into the prompt. They're imported and stored today, but not yet sent to the model.
  - ground recommendations in current news about each asset, e.g. through tool use or web search
- **Open Finance / brokerage integration**, so holdings sync automatically instead of being imported by CSV.

**Engineering**

- **Background jobs on Redis + BullMQ:**
  - `POST /advisor/analyze` currently calls Claude synchronously inside the HTTP request. It should queue a job, return `202` with a job id, and let the UI poll. That brings retries with backoff and one analysis per user at a time.
  - The same queue should run the scheduled jobs. Today they're `@nestjs/schedule` crons inside the API process, so two API instances would run every job twice. BullMQ job schedulers queue each run once, and it can run on a separate worker process.
- **A second-model PR reviewer** in CI, to go with the spec-implementer agent. It's in progress as open experiments ([#164](https://github.com/caioq/ai-investment-assistant/pull/164), [#182](https://github.com/caioq/ai-investment-assistant/pull/182)).

## Known issues and cuts

- **Fail fast in production when `ANTHROPIC_API_KEY` is missing.** The advisor is core to the product, so the API should refuse to start without the key when `NODE_ENV=production`. Development and the demo keep booting without one, and there generating an analysis should return a `503` with a clear message instead of today's generic 500.
- **Performance counts new money as growth.** The performance chart shows total portfolio value, so if you buy more stock, it looks like your investments grew. Fixing this needs a record of each purchase and sale, and the app only stores each holding's current quantity and average price.
- **No retry or backoff on Yahoo calls.** Keeping the last good price makes this tolerable, but an unofficial API deserves retries with increasing delays and a way to stop calling it after repeated failures.
- **No loading/spinners.** Cards and charts appear all at once, and generating an analysis shows no progress while it runs.
- **Holdings can't be searched, sorted or edited.** The list is always ordered by value, and changing a position means importing the CSV again.
