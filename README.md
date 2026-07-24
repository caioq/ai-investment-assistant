# AI Investment Assistant

Personal investment platform to visualize a B3 stock portfolio — allocation by sector/stock/investment style/risk rating, performance over time against benchmarks (Ibovespa, CDI) — plus an **AI Portfolio Advisor** that generates a strengths/risks/recommendations analysis from your holdings, a research house's free-text report, and that research house's structured model portfolios (Dividends, Overall Recommended, Small Caps).

## Status

Specs are written; implementation hasn't started yet. See [`specs/`](specs/) for what's planned and [`WORKFLOW.md`](WORKFLOW.md) for how this project gets built.

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
| [auth](specs/auth/spec.md) | — |
| [market-data](specs/market-data/spec.md) | — |
| [portfolio](specs/portfolio/spec.md) | auth, market-data |
| [recommended-portfolios](specs/recommended-portfolios/spec.md) | market-data |
| [advisor](specs/advisor/spec.md) | portfolio, market-data, recommended-portfolios |
| [dashboard-ui](specs/dashboard-ui/spec.md) | auth, portfolio, advisor |

Project-level conventions and setup notes live in [`CLAUDE.md`](CLAUDE.md) and [`CONVENTIONS.md`](CONVENTIONS.md).

## Getting started

Not available yet — no application code exists in this repo yet, only specs and workflow tooling. This section will be filled in once the `project-setup` module is implemented.
