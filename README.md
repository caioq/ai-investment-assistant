# AI Investment Assistant

Personal investment platform to visualize a B3 stock portfolio — allocation by sector/stock/investment style/risk rating, performance over time against benchmarks (Ibovespa, CDI) — plus an **AI Portfolio Advisor** that generates a strengths/risks/recommendations analysis from your holdings, a research house's free-text report, and that research house's structured model portfolios (Dividends, Overall Recommended, Small Caps).

## Status

The modules under [`specs/`](specs/) are implemented: `project-setup`, `auth`, `auth-ui`, `market-data`, `portfolio`, `recommended-portfolios`, `advisor`, `data-sources`, `dashboard-ui` and `demo-seed`. See each module's `stories/README.md` for its current story-level status, and [`WORKFLOW.md`](WORKFLOW.md) for how this project gets built.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind
- **Backend:** NestJS, TypeScript
- **Database:** Postgres via Prisma
- **Market data:** Yahoo Finance's public quote/chart endpoints (B3 quotes + history) — unofficial API, no key required; see [`specs/market-data/spec.md`](specs/market-data/spec.md) for why
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

```bash
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` (`scripts/bootstrap.sh`) does everything a fresh clone needs in one shot: installs dependencies, starts Postgres (`docker compose up -d db --wait`), creates `apps/api/.env` from `.env.example` with `DATABASE_URL` pre-filled for local dev (skipped if the file already exists — safe to re-run any time), runs Prisma migrations, and builds `packages/shared` (`pnpm dev` doesn't rebuild it automatically, so a stale/missing `dist/` otherwise shows up as `Module not found: Can't resolve '@ai-investment-assistant/shared'` in either app). `pnpm dev` then starts both apps.

`pnpm bootstrap` never seeds data (it leaves `users` empty).

### Demo account

To get a fully populated app (holdings, allocation on every dimension, a 1Y performance series with IBOVESPA and CDI, an advisor analysis, and import state on every data-sources card):

```bash
pnpm bootstrap:demo && pnpm dev
```

Then log in with **`demo@example.com` / `Demo1234!`**. `pnpm bootstrap:demo` is `pnpm bootstrap` plus `pnpm db:seed` (`scripts/bootstrap.sh --seed`). On a database that is already set up, run `pnpm db:seed` on its own. The seed is idempotent (re-running is safe) and prints the credentials when it finishes.

The seed has a production guard (`apps/api/prisma/seed/guard.ts`) and refuses to run when:

- `NODE_ENV` is `production` (`DEMO_SEED_ALLOW_REMOTE` does **not** override this);
- `DATABASE_URL` is unset or cannot be parsed as a URL;
- the `DATABASE_URL` host is not one of `localhost`, `127.0.0.1`, `::1`, `db`, `db-test`. Set `DEMO_SEED_ALLOW_REMOTE=true` to seed a disposable remote database anyway.

<details>
<summary>Equivalent manual steps, if you want to run (or debug) each one yourself</summary>

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start Postgres:
   ```bash
   docker compose up -d db
   ```
   (`db-test` is only needed for `apps/api`'s e2e tests against a real database.)
3. Create the API's env file and set `DATABASE_URL` (see `.env.example` for the full list — the rest are unused until auth/advisor are implemented):
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
5. Build `packages/shared` once:
   ```bash
   pnpm --filter @ai-investment-assistant/shared build
   ```
6. Start both apps in dev mode:
   ```bash
   pnpm dev
   ```

</details>
