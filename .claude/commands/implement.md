---
description: Implement exactly one task via the spec-implementer agent, isolated in a git worktree
---

Implement: $ARGUMENTS

This is stage 3 of the spec-driven workflow (spec → user stories/tasks → implement, see `CLAUDE.md`). Scope is exactly one task per run — never a whole story or module in one call.

1. Resolve `$ARGUMENTS` to a single task file under `specs/<module>/tasks/`:
   - A direct path or a task id like `US-1_T-2` (search `tasks/` for a matching filename) resolves directly.
   - A story (e.g. `US-1` or `<module>/US-1`) or a bare module name resolves to the **first** task in that scope, in file order, whose `Status` is `Not Started`.
   - If everything in scope is already `Done`, say so and stop — there's nothing to implement.
2. Before launching the agent, confirm:
   - The resolved task's `Status` isn't already `Done` (if it is, ask before redoing it).
   - Its story's `Status` is `Ready` or `In Progress` — if still `Draft`, stop and suggest `/user-stories` first.
   - Every task in its `**Depends on:**` field has `Status: Done` — if not, resolve to that dependency instead, or tell the user why nothing can proceed. A dependency that's `Done` but not yet merged is fine: `spec-implementer` stacks its branch on that dependency's still-open PR automatically (see `CONVENTIONS.md` → "GitHub issue / project sync") rather than blocking.
3. Launch the `spec-implementer` agent with `isolation: "worktree"`, passing it the resolved task file's path. Prefer running it in the background (`run_in_background: true`) so multiple `/implement` calls — for independent tasks — can proceed concurrently without blocking each other; only run in the foreground if the user is explicitly waiting on this one result before deciding what to do next.
4. When the agent finishes, report: what was implemented, the test that verifies it, and the PR it opened (URL, branch, and base branch — `main`, or a dependency's branch if it stacked). The agent pushes and opens the PR itself once the task's test is green; it never merges — reviewing and merging is still on the user. If it stacked on a dependency's still-open PR, flag that the dependency's PR needs to merge first for this one to land cleanly.
