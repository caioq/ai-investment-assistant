# Conventions

Living map of established patterns and reusable pieces in this codebase. Read this before implementing a task, so architecture doesn't need to be rediscovered by scanning the whole repo. Updated incrementally: whenever a task introduces a new reusable pattern, model, or utility, add a short entry here before marking that task `Done`. Keep entries short — a pointer (file path + one line), not a tutorial. Delete a placeholder heading's `<...>` note once real content exists under it.

## Backend (`apps/api`)

### Module structure
- One module per domain under `apps/api/src/<name>/` (`auth/`, `portfolio/`, `market-data/`, `advisor/`), each with `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, and a `dto/` subfolder.
- Controllers stay thin: request/response shaping and calling into services only. Business logic (allocation math, prompt building, price aggregation, etc.) lives in services — or in `packages/shared` if it's pure logic the frontend also needs.
- All controller inputs are validated with `class-validator` DTOs behind a single global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`) registered once in `main.ts` — no ad hoc manual validation inside individual controllers.
- `PrismaService` lives in a global `PrismaModule` (`apps/api/src/prisma/`), injected via constructor DI wherever a service needs DB access. Nothing instantiates `PrismaClient` directly.

### Shared utilities / models
<Not established yet — the first entry here will be the CAGR/volatility/drawdown calculations, expected at `packages/shared/src/metrics.ts` once the `portfolio` module's performance tasks land.>

### Testing
- Jest (NestJS default), spec files colocated next to the code they test (`*.spec.ts`).
- Unit tests mock `PrismaService`. Integration/e2e tests run against a real test Postgres (separate `docker-compose` service, migrated before the suite runs) through `supertest` against an actual Nest application instance — not mocked at the HTTP layer.

## Frontend (`apps/web`)

### Component conventions
- App Router, Server Components by default. Add `'use client'` only on the smallest leaf component that actually needs interactivity/state — never mark a whole page client-side because one child needs it (e.g. in the dashboard, `AdvisorPanel`'s state machine is a client component; the page shell around it isn't).
- Data fetching happens in Server Components via `fetch()` calling the NestJS API directly, with `credentials: 'include'` so the auth cookie is forwarded. Client components receive data as props — they only fetch on their own for a genuinely client-triggered action (e.g. clicking "Generate Portfolio Analysis").
- Shared UI primitives (`Button`, `Card`, `Badge`) live under `apps/web/components/ui/`, one file per component.

### Shared utilities
- `apps/web/lib/types.ts` re-exports types from `packages/shared` rather than redefining them — the frontend never declares its own copy of a shape `packages/shared` already owns.

### Testing
- Vitest + React Testing Library for component tests, colocated `*.test.tsx` next to the component.
- Playwright specs live under `apps/web/e2e/`, one spec per critical user flow (not one per page).

## Cross-cutting

### Auth
- Every protected controller uses a shared `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) that resolves `req.user.id` from the `access_token` httpOnly cookie. No endpoint outside `AuthModule` accepts a `userId`/`portfolioId` from the client — it always comes from `req.user.id`.

### Naming
- NestJS files: kebab-case (`market-data.service.ts`), matching Nest CLI defaults.
- React components: PascalCase file and export name (`AllocationDonut.tsx`).
- Functions/variables: camelCase everywhere (TS on both sides).
- Prisma enum values: SCREAMING_SNAKE_CASE, matching what's already in the specs (`EQUITY`, `DIVIDENDS`, `OVERALL_RECOMMENDED`, ...) — don't introduce a different casing for a new enum.
