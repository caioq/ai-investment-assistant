---
description: Scaffold or update a module spec (PRD) under specs/, following specs/TEMPLATE.md
---

The user wants to write or update a spec for: $ARGUMENTS

This is stage 1 of the spec-driven workflow (spec → user stories/tasks → implement, see `CLAUDE.md`). Scope is strictly the PRD-level spec — no user stories, no task breakdown, no code.

1. Read `specs/_templates/spec.md` for the required structure.
2. Read `CLAUDE.md` for the current spec table and dependency graph, and skim any existing specs this one is likely to depend on or be depended on by.
3. If `specs/<module>/spec.md` already exists, treat this as an update: read it fully first, then edit it — don't discard existing decisions without flagging the change to the user.
4. If this is a new spec:
   - Ask the user (don't assume) whatever is genuinely undecided: the problem it solves, explicit non-goals, which existing specs it depends on.
   - Write `specs/<kebab-case-module-name>/spec.md` using every section of the template, in order. Delete "Open Questions" only if it's actually empty.
   - Data Model and API Contract should be concrete (real field names, real endpoint paths) whenever the conversation or existing specs already make that clear — don't leave them vague if you have the information.
   - Acceptance Criteria must be concrete and checkable by running the app or a test — not "works correctly."
5. Update the spec table in `CLAUDE.md` to include the new file and its dependencies.
6. Set `**Status:**` to `Draft` for a spec the user hasn't confirmed yet, or `Approved` if this formalizes a decision already agreed in conversation.

Stop here. Do not create user stories, tasks, or implementation code — that's `/user-stories` and `/implement`.
