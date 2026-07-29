# Auth — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-registration.md) | Registration | Ready | T-1..T-3 in `../tasks/` |
| [US-2](./US-2-login.md) | Login | Done | T-1..T-2 in `../tasks/` |
| [US-3](./US-3-guarded-session.md) | Guarded session | Done | T-1..T-3 in `../tasks/` |

## Cross-cutting tasks

Work shared by more than one story lives in `../tasks/SHARED_T-<T>-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

- [`AUTH_SHARED_T-1-prisma-module.md`](../tasks/AUTH_SHARED_T-1-prisma-module.md) — `PrismaModule`/`PrismaService`, the DB access foundation every service task in this module (and every future module) depends on. Shared by US-1, US-2.
- [`AUTH_SHARED_T-2-cors-bootstrap.md`](../tasks/AUTH_SHARED_T-2-cors-bootstrap.md) — CORS config in `main.ts` so the browser can send/receive the `access_token` cookie cross-port. Shared by US-1, US-2, US-3.

## Out of scope for this pass

- Wiring the shared `AuthGuard` into other modules' controllers (portfolio, market-data, advisor) — those endpoints don't exist yet. Each of those modules' own `/user-stories` pass is responsible for applying the guard when it builds its controllers, per the spec's Behavior Note ("no endpoint outside `AuthModule` accepts a `userId` from the client").
- Password reset and OAuth — explicit spec Non-Goals.
