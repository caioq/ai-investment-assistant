# ai-hack-day-invest

Personal investment platform: visualize a B3 stock portfolio (allocation by sector/stock/style/risk, performance over time vs. benchmarks), with an AI Portfolio Advisor that generates a strengths/risks/recommendations analysis from the user's holdings, a research house's free-text report, and that research house's structured model portfolios.

**All documentation in this repo (specs, this file, READMEs, code comments) is written in English**, regardless of the language used in conversation.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind — `apps/web/`
- **Backend:** NestJS, TypeScript — `apps/api/`
- **Database:** Postgres via Prisma — `apps/api/prisma/schema.prisma`
- **Market data:** brapi.dev (B3 quotes + history)
- **AI:** Claude API (Anthropic), structured output
- **Repo layout:** pnpm workspace monorepo — `apps/web`, `apps/api`, `packages/shared`

Repo structure and full architectural decisions are in the spec files below, not duplicated here — this file should stay short.

## Spec-driven development

This project is built spec-first, in three stages per module: **spec → user stories/tasks → implement**. See [`WORKFLOW.md`](WORKFLOW.md) for the full guide (how to use each command/skill/agent, a walkthrough, best practices) — this section is just the reference summary. Each module has a directory under [`specs/`](specs/):

- `specs/<module>/spec.md` — the PRD: problem, goals, non-goals, data model, API contract, behavior notes, acceptance criteria. Written against [`specs/_templates/spec.md`](specs/_templates/spec.md). Source of truth for *what* a module should do.
- `specs/<module>/stories/` — one file per user story (`US-<N>-<title>.md`), plus a `README.md` index. Each story traces to a spec Goal/Acceptance Criterion and links to its own task files.
- `specs/<module>/tasks/` — one file per individual task (`T-<T>_US-<N>-<title>.md`, or `T-<T>_SHARED-<title>.md` for cross-cutting work), each with its own `Status` and a concrete, verifiable "done when" condition.

Stories and tasks are deliberately one-per-file rather than bundled checklists — it keeps `/implement`'s context small when working at single-task granularity, and lets independent tasks be picked up (or parallelized) without a shared file becoming a bottleneck.

If code and spec/stories/tasks disagree, that's a bug in one of them, not a judgment call.

Current specs:

| Spec | Depends on |
|---|---|
| [auth](specs/auth/spec.md) | — |
| [market-data](specs/market-data/spec.md) | — |
| [portfolio](specs/portfolio/spec.md) | auth, market-data |
| [recommended-portfolios](specs/recommended-portfolios/spec.md) | market-data |
| [advisor](specs/advisor/spec.md) | portfolio, market-data, recommended-portfolios |
| [dashboard-ui](specs/dashboard-ui/spec.md) | auth, portfolio, advisor |

Implementation order should generally follow the dependency column above (a module's spec assumes the ones it depends on already exist).

**Workflow:**
- `/spec <module-name>` — scaffold or update `specs/<module>/spec.md`. PRD-level only, no stories/tasks/code.
- `/user-stories <module-name>` — once a spec is `Approved`, break it into `specs/<module>/stories/` and `specs/<module>/tasks/`.
- `/implement <task-id-or-file>` — implement exactly **one** task, via the `spec-implementer` agent in an isolated git worktree, using strict red-green TDD. Never a whole story or module in one call — that's what makes running several `/implement` calls in parallel (different tasks, different worktrees) safe. Never skips ahead of `/spec` and `/user-stories`.
- Update `Status` in the story/task files themselves as work is verified — a task not marked `Done` means "not actually done yet," regardless of what the code looks like.

## Conventions

- No feature work outside what an approved spec describes. If you notice a spec is wrong or incomplete while implementing it, stop and update the spec first (or flag it), rather than silently implementing something else.
- Pure/testable logic (allocation math, CAGR/volatility/drawdown, formatters) belongs in `packages/shared`, not duplicated between `apps/web` and `apps/api`.
- Every task is implemented test-first (red-green TDD) — a task's `Test:` field defines what "done" means, not a subjective read of the code.
- [`CONVENTIONS.md`](CONVENTIONS.md) is the living map of established patterns, models, and shared utilities — read it before implementing to avoid rediscovering architecture by scanning the whole repo, and append to it when a task introduces something genuinely new and reusable.
