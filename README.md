# AI Investment Assistant

Personal investment platform to visualize a B3 stock portfolio — allocation by sector/stock/investment style/risk rating, performance over time against benchmarks (Ibovespa, CDI) — plus an **AI Portfolio Advisor** that generates a strengths/risks/recommendations analysis from your holdings, a research house's free-text report, and that research house's structured model portfolios (Dividends, Overall Recommended, Small Caps).

## Status

`project-setup` is implemented (monorepo scaffold, health check, CI). Other modules are spec'd but not yet built. See [`specs/`](specs/) for what's planned and [`WORKFLOW.md`](WORKFLOW.md) for how this project gets built.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind
- **Backend:** NestJS, TypeScript
- **Database:** Postgres via Prisma
- **Market data:** [brapi.dev](https://brapi.dev) (B3 quotes + history)
- **AI:** Claude API (Anthropic), structured output

## How this project is built

This repo is developed spec-first: every module has a PRD under `specs/<module>/spec.md`, broken into user stories and tasks, implemented one task at a time with TDD. Full explanation, including how to use the `/spec`, `/user-stories`, and `/implement` commands: **[`WORKFLOW.md`](WORKFLOW.md)**.

Current modules:

| Spec | Depends on |
|---|---|
| [project-setup](specs/project-setup/spec.md) | — |
| [auth](specs/auth/spec.md) | project-setup |
| [market-data](specs/market-data/spec.md) | project-setup |
| [portfolio](specs/portfolio/spec.md) | project-setup, auth, market-data |
| [recommended-portfolios](specs/recommended-portfolios/spec.md) | project-setup, market-data |
| [advisor](specs/advisor/spec.md) | project-setup, portfolio, market-data, recommended-portfolios |
| [dashboard-ui](specs/dashboard-ui/spec.md) | project-setup, auth, portfolio, advisor |

Project-level conventions and setup notes live in [`CLAUDE.md`](CLAUDE.md) and [`CONVENTIONS.md`](CONVENTIONS.md).

## Getting started

Requires Node, [pnpm](https://pnpm.io) (see `packageManager` in `package.json` for the exact version), and Docker.

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start Postgres:
   ```bash
   docker compose up -d db
   ```
   (`db-test` is only needed for `apps/api`'s e2e tests against a real database.)
3. Create the API's env file and set `DATABASE_URL` (see `.env.example` for the full list — the rest are unused until auth/market-data/advisor are implemented):
   ```bash
   cp .env.example apps/api/.env
   ```
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/investment_assistant?schema=public
   ```
4. Run Prisma migrations:
   ```bash
   pnpm db:migrate
   ```
5. Build `packages/shared` once — `pnpm dev` doesn't rebuild it automatically, so a stale/missing `dist/` shows up as `Module not found: Can't resolve '@ai-investment-assistant/shared'` in either app:
   ```bash
   pnpm --filter @ai-investment-assistant/shared build
   ```
6. Start both apps in dev mode:
   ```bash
   pnpm dev
   ```
