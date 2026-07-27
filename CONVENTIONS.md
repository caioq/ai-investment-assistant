# Conventions

Living map of established patterns and reusable pieces in this codebase. Read this before implementing a task, so architecture doesn't need to be rediscovered by scanning the whole repo. Updated incrementally: whenever a task introduces a new reusable pattern, model, or utility, add a short entry here before marking that task `Done`. Keep entries short — a pointer (file path + one line), not a tutorial. Delete a placeholder heading's `<...>` note once real content exists under it.

## Backend (`apps/api`)

### Module structure
- One module per domain under `apps/api/src/<name>/` (`auth/`, `portfolio/`, `market-data/`, `advisor/`), each with `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, and a `dto/` subfolder.
- Controllers stay thin: request/response shaping and calling into services only. Business logic (allocation math, prompt building, price aggregation, etc.) lives in services — or in `packages/shared` if it's pure logic the frontend also needs.
- All controller inputs are validated with `class-validator` DTOs behind a single global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`) registered once in `main.ts` — no ad hoc manual validation inside individual controllers.
- `PrismaService` lives in a global `PrismaModule` (`apps/api/src/prisma/`), injected via constructor DI wherever a service needs DB access. Nothing instantiates `PrismaClient` directly.
- Prisma schema at `apps/api/prisma/schema.prisma` (datasource/generator only until a module adds models); `apps/api/prisma.config.ts` (Prisma 7) reads `DATABASE_URL` from `apps/api/.env` (gitignored, not committed — matches the `db` service in root `docker-compose.yml`: `postgresql://postgres:postgres@localhost:5432/investment_assistant?schema=public`). Root `pnpm db:migrate` proxies to `apps/api`'s own `db:migrate` script (`prisma migrate dev`), which needs `db` (from `docker-compose.yml`) up first.

### Shared utilities / models
- `apps/api` depends on `@ai-investment-assistant/shared` (`workspace:*`) — see `apps/api/package.json` and its use in `apps/api/src/health/shared-info.service.ts`. Node resolves the package's `main`/`types` fields to `packages/shared/dist`, so `pnpm --filter @ai-investment-assistant/shared build` must run before the package's exports are usable from `apps/api` (at runtime or type-check) — `pnpm build` at the repo root does this for the whole workspace. A future utility (e.g. the CAGR/volatility/drawdown calculations expected at `packages/shared/src/metrics.ts` once the `portfolio` module's performance tasks land) is consumed the same way.

### Testing
- Jest (NestJS default), spec files colocated next to the code they test (`*.spec.ts`).
- Unit tests mock `PrismaService`. Integration/e2e tests run against a real test Postgres (separate `docker-compose` service, migrated before the suite runs) through `supertest` against an actual Nest application instance — not mocked at the HTTP layer.
- e2e specs live in `apps/api/test/*.e2e-spec.ts`, run via `pnpm --filter api test:e2e` (Jest config at `apps/api/test/jest-e2e.json`, `ts-jest` transform). Build a real app with `Test.createTestingModule({ imports: [AppModule] }).compile()` then `.createNestApplication()` + `.init()` — see `apps/api/test/health.e2e-spec.ts` for the pattern. Endpoints with no DB dependency (like `/health`) need no Postgres/`docker-compose` setup to run this way.

## Frontend (`apps/web`)

### Component conventions
- App Router, Server Components by default. Add `'use client'` only on the smallest leaf component that actually needs interactivity/state — never mark a whole page client-side because one child needs it (e.g. in the dashboard, `AdvisorPanel`'s state machine is a client component; the page shell around it isn't).
- Data fetching happens in Server Components via `fetch()` calling the NestJS API directly, with `credentials: 'include'` so the auth cookie is forwarded. Client components receive data as props — they only fetch on their own for a genuinely client-triggered action (e.g. clicking "Generate Portfolio Analysis").
- Shared UI primitives (`Button`, `Card`, `Badge`) live under `apps/web/components/ui/`, one file per component.

### Shared utilities
- `apps/web/lib/types.ts` re-exports types from `packages/shared` rather than redefining them — the frontend never declares its own copy of a shape `packages/shared` already owns.
- `apps/web` depends on `@ai-investment-assistant/shared` (`workspace:*`) — see `apps/web/package.json` and its use in `apps/web/app/page.tsx`. Same build-before-consume caveat as `apps/api` (see above): `pnpm --filter @ai-investment-assistant/shared build` must run before the package's exports resolve from `apps/web` (dev server, `next build`, or Vitest) since Node resolves `packages/shared/dist`.

### Testing
- Vitest + React Testing Library for component tests, colocated `*.test.tsx` next to the component.
- Vitest is configured at `apps/web/vitest.config.ts` (jsdom environment, `@vitejs/plugin-react`) with `apps/web/vitest.setup.ts` loading `@testing-library/jest-dom/vitest` for the `toBeInTheDocument()`-style matchers, and registering `afterEach(() => cleanup())` (from `@testing-library/react`) so multiple `render()` calls across tests in one file don't leak DOM nodes into later assertions (`globals` isn't enabled in the Vitest config, so RTL's auto-cleanup doesn't kick in on its own). Run via `pnpm --filter web test` (`vitest run`).
- Playwright specs live under `apps/web/e2e/`, one spec per critical user flow (not one per page).

## Cross-cutting

### Shared TypeScript/ESLint/Prettier config
- `tsconfig.base.json` (repo root) holds shared strict compiler options with no `module`/`moduleResolution`/`include` opinion — each package's own `tsconfig.json` does `"extends": "../../tsconfig.base.json"` and sets its own `module`/`moduleResolution`/`include`/`outDir` (Nest needs `commonjs`+`node`, Next needs `esnext`+`bundler`).
- `eslint.config.mjs` (repo root, flat config) is the shared ESLint base (`@eslint/js` recommended + `typescript-eslint` recommended + `eslint-config-prettier` to defer style to Prettier). Each package imports and spreads it rather than declaring its own rules: `import rootConfig from '../../eslint.config.mjs'; export default [...rootConfig, /* package overrides */];`
- `.prettierrc.json` / `.prettierignore` (repo root) is the one Prettier config for the whole repo — packages don't declare their own.
- Root `package.json`'s `lint` script runs `eslint .` (self-lints the shared config plus anything at repo root) before delegating to `pnpm -r run lint`, so a broken root config fails fast instead of hiding behind "no projects matched".

### Local Postgres (docker-compose)
- Root `docker-compose.yml` (`caioq/ai-investment-assistant`) defines two Postgres 16 services: `db` (dev, host port `5432`, db name `investment_assistant`) and `db-test` (test, host port `5433`, db name `investment_assistant_test`) — separate host ports so `db-test` never collides with `db` and integration tests never touch dev data. Both use `postgres`/`postgres` credentials and a `pg_isready` healthcheck. `pnpm db:migrate` (and any future `apps/api` `DATABASE_URL`) targets `db`; the test suite's `DATABASE_URL` targets `db-test`.

### Auth
- Every protected controller uses a shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) that resolves `req.user.id` from the `access_token` httpOnly cookie. No endpoint outside `AuthModule` accepts a `userId`/`portfolioId` from the client — it always comes from `req.user.id`.

### GitHub issue / project sync
- Repo: `caioq/ai-investment-assistant`. Board: [GitHub Project #2](https://github.com/users/caioq/projects/2) (user-owned, not org). Status field options include **In Review** — confirm the exact option label against the project the first time you touch it, since it's user-managed and can be renamed.
- `/user-stories` (via the `spec-to-stories` skill) creates one GitHub issue per task file (never per story) through the `github` MCP server, and records the issue number in that task's `**GitHub Issue:**` field. Task files remain the source of truth for `/implement` — the issue is a mirror for board visibility, not a second source of status.
- `spec-implementer` moves the linked issue's Project status: to **In Progress** when it sets the task's own `Status: In Progress`, and to **In Review** when it sets `Status: Done` (tests green). It never closes the issue — closing happens naturally when the PR that references it (`Closes #<issue>`) merges to `main`, which is a manual step the user does after reviewing the diff.
- GitHub MCP tool names aren't hardcoded here since the server's toolset can change — discover the current ones with `ToolSearch` (e.g. `"github issue"`, `"github project"`) before calling them.

### Branching, pushing, and PRs per task
- Branch naming: `task/US-<N>_T-<T>-<short-title>` (or `task/SHARED_T-<T>-<short-title>`) — matches the task file's own basename minus `.md`. This is what makes a task's branch/PR discoverable by name alone, which the dependency-branching rule below relies on.
- Once a task's test is green and its `Status` is set to `Done`, `spec-implementer` commits, pushes its branch, and opens the PR itself via the `github` MCP server (`mcp__github__create_pull_request`, body includes `Closes #<issue>` when the task has a linked issue) — not the `gh` CLI, which isn't installed in this environment. It never merges — merging is always a manual, reviewed step the user does. If the MCP server isn't reachable from the worktree sandbox, the branch still gets pushed and the parent `/implement` session opens the PR afterward instead.
- Every task file has a `**Depends on:**` field (`none`, or a comma-separated list of task ids) — this is what `spec-implementer` resolves before picking what to branch off, rather than inferring order from task numbering or story prose:
  - Every listed dependency `Done` and merged (no open PR left on its branch) → branch off `main`. This is the common case and should stay the common case.
  - A listed dependency `Done` but its PR still open → branch off that dependency's branch instead (a stacked PR), so the new task builds on real code rather than a stale `main`.
  - Any listed dependency not yet `Done` → refuse and report blocked; never guess by building on `main` anyway.
- Stacking is a fallback for keeping parallel `/implement` runs moving, not the default habit — merge each task's PR soon after reviewing it so the next task branches off a current `main`. GitHub doesn't auto-rebase a stacked PR after its base is squash-merged, so the longer a stack sits unmerged, the more manual rebasing (`git rebase main` in that task's worktree, then force-push) it'll need later.

### Naming
- NestJS files: kebab-case (`market-data.service.ts`), matching Nest CLI defaults.
- React components: PascalCase file and export name (`AllocationDonut.tsx`).
- Functions/variables: camelCase everywhere (TS on both sides).
- Prisma enum values: SCREAMING_SNAKE_CASE, matching what's already in the specs (`EQUITY`, `DIVIDENDS`, `OVERALL_RECOMMENDED`, ...) — don't introduce a different casing for a new enum.
