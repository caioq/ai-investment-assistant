# US-1: Monorepo workspace scaffold

**Status:** Ready
**Traces to:** spec Goal "pnpm workspace monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`" / Goal "Shared TypeScript/ESLint/Prettier config used consistently by both apps and `packages/shared`" / Goal "`.env.example` documenting every environment variable later specs will need" / AC "`pnpm install` completes cleanly from a fresh clone" (in `../spec.md`)

As a `developer`, I want a pnpm workspace scaffolded with the `apps/web`, `apps/api`, and `packages/shared` layout, root-level scripts, shared lint/format/typecheck config, and a documented `.env.example`, so that every other module has one consistent place to add code and one set of commands to run, lint, and typecheck it.

## Tasks

- [ ] [T-1: Initialize pnpm workspace and root scripts](../tasks/T-1_US-1-init-pnpm-workspace.md)
- [ ] [T-2: Shared TypeScript/ESLint/Prettier config](../tasks/T-2_US-1-shared-lint-config.md)
- [ ] [T-3: `.env.example` documenting all env vars](../tasks/T-3_US-1-env-example.md)

## Notes

T-1 only needs `pnpm-workspace.yaml` and the root `package.json` to exist — it doesn't require `apps/web`, `apps/api`, or `packages/shared` to have real content yet (those land in US-2, US-3, US-5). `pnpm install` succeeding against workspace globs that don't yet match anything is expected and fine at this stage; T-1's own test only asserts the root install path, not what's inside each workspace package.
