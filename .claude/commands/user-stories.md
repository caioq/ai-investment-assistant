---
description: Break an approved spec into per-story and per-task files under stories/ and tasks/
---

Break down the spec for: $ARGUMENTS

This is stage 2 of the spec-driven workflow (spec → user stories/tasks → implement, see `CLAUDE.md`). Use the `spec-to-stories` skill for the breakdown methodology and exact naming/output structure — load it before doing anything else.

Preconditions:
- `specs/<module>/spec.md` must exist and have `**Status:** Approved` (or the user explicitly approves it in this conversation). If it's still `Draft`, stop and ask whether to run `/spec` first or approve it as-is now.
- If `specs/<module>/stories/` already has files, this is a refinement pass, not a rewrite from scratch — the skill covers how to handle that (preserve completed tasks, numbering, and status).

Output: `specs/<module>/stories/README.md`, one `stories/US-<N>-<short-title>.md` per story, and one `tasks/T-<T>_US-<N>-<short-title>.md` per task (plus `tasks/T-<T>_SHARED-<short-title>.md` for cross-cutting work) — all against the templates in `specs/_templates/`. Also creates one GitHub issue per task file (mirrored, not a second source of truth — see the skill's "Creating GitHub issues for tasks" section and `CONVENTIONS.md`), skipped with a warning if the `github` MCP server isn't connected.
