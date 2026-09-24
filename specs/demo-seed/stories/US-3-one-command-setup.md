# US-3: Set up the demo with one command

**Status:** Done
**Traces to:** spec Goal "A seed separate from the default setup"; ACs "Commands", "Manual", "Docs" (in `../spec.md`)

As a **reviewer cloning the repo**, I want `pnpm bootstrap:demo && pnpm dev` to take me from a fresh clone to a logged-in, populated app, while plain `pnpm bootstrap` stays seed-free, so that setting up the demo is one step and never happens by accident.

## Tasks

- [x] [T-1: `db:seed` / `bootstrap:demo` command wiring](../tasks/DEMO_SEED_US-3_T-1-command-wiring.md)
- [x] [T-2: README and CONVENTIONS docs, fresh-clone check](../tasks/DEMO_SEED_US-3_T-2-docs-and-fresh-clone.md)
