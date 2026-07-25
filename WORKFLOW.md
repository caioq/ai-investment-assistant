# Spec-Driven Development Workflow

This repo is built spec-first, using three purpose-built pieces of Claude Code: a **command** per stage, a **skill** for the methodology that stage needs, and an **agent** for isolated execution. This doc explains how they fit together, what each one does, and how to actually use this day to day.

## Why spec-first

Left unguided, an AI coding assistant tends to drift: it invents scope you didn't ask for, "helpfully" touches adjacent code, and its definition of "done" is whatever it feels like checking. Spec-driven development fixes this by front-loading three decisions into files *before* code gets written:

- **What** a module should do (the spec) — so scope is decided once, not re-litigated implicitly every time code is touched.
- **How** it breaks into checkable units (stories/tasks) — so "done" is a specific, verifiable condition, not a vibe.
- **Who's allowed to touch what** during implementation (one task per agent run) — so parallel work doesn't collide.

If code and the spec/stories/tasks disagree, that's a bug in one of them — never a judgment call made silently mid-implementation.

## Prerequisites

- **GitHub MCP server** — `/user-stories` and `/implement` mirror each task as a GitHub issue on [GitHub Project #2](https://github.com/users/caioq/projects/2) (details in `CONVENTIONS.md` → "GitHub issue / project sync"). Connect it once, outside of any Claude Code chat (so the token never lands in conversation history):
  1. Create a Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens) scoped to `caioq/ai-investment-assistant`. Fine-grained: "Issues" read-write and "Projects" read-write. Classic: `repo` + `project`.
  2. In your terminal:
     ```
     claude mcp add --transport http github https://api.githubcopilot.com/mcp/ -H "Authorization: Bearer <your-token>"
     ```
  3. Restart Claude Code (or start a new session) if one was already running — MCP servers load at session start, so a server added mid-session won't show up until the next one.
  4. Verify with `claude mcp list` — should show `github` as `Connected`.

  If this isn't set up, `/user-stories` still produces the spec/task files — it just skips issue creation with a warning, and `/implement` skips the board-sync step. Nothing blocks on it.

## The three stages

```
   /spec              /user-stories             /implement
  ──────────►  spec.md  ──────────►  stories/ + tasks/  ──────────►  code + tests
  (PRD)                              (breakdown)                    (one task, TDD, worktree)
```

| Stage | Command | Input | Output | Status gate |
|---|---|---|---|---|
| 1. Spec | `/spec <module>` | conversation + existing specs | `specs/<module>/spec.md` | must reach `Approved` before stage 2 |
| 2. Stories/Tasks | `/user-stories <module>` | an `Approved` spec | `specs/<module>/stories/`, `specs/<module>/tasks/` | a story must reach `Ready` before stage 3 |
| 3. Implement | `/implement <task>` | one `Not Started` task | code + passing test, `Status: Done` | — |

### File layout

```
specs/
  _templates/           # spec.md, stories-readme.md, story.md, task.md
  <module>/
    spec.md              # the PRD — problem, goals, non-goals, data model, API, acceptance criteria
    stories/
      README.md           # index: every story, status, task count
      US-1-<title>.md      # one story: role/goal/benefit, traces to a spec Goal/AC, links its tasks
      US-2-<title>.md
    tasks/
      T-1_US-1-<title>.md   # one task: what to do, which test proves it, current Status
      T-2_US-1-<title>.md
      T-1_SHARED-<title>.md  # cross-cutting task, shared by more than one story
CONVENTIONS.md            # living map of established patterns — read before implementing, updated after
CLAUDE.md                 # short project overview + pointer to all of the above
```

Everything is deliberately **one concern per file**: one module's PRD, one story, one task. This is what lets `/implement` load just enough context for a single task instead of an entire module, and what lets independent tasks be implemented in parallel without a shared file turning into a merge conflict.

## The commands

### `/spec <module>`

Scaffolds or updates `specs/<module>/spec.md` against `specs/_templates/spec.md`. This is PRD-level only — problem, goals, non-goals, data model, API contract, behavior notes, acceptance criteria. No stories, no tasks, no code.

- If the module's spec already exists, this is an update pass — reads it first, edits rather than discards.
- Asks about anything genuinely undecided (problem, non-goals, dependencies) instead of assuming.
- Sets `Status: Draft` for anything not yet confirmed, `Approved` once you've actually agreed to it.

**Use it:** starting a new module, or revisiting one because a decision changed.

### `/user-stories <module>`

Breaks an `Approved` spec into `specs/<module>/stories/` and `specs/<module>/tasks/`, using the `spec-to-stories` skill for the actual methodology (see below).

- Refuses to run against a `Draft` spec without you explicitly overriding that.
- Re-running it on a module that already has stories/tasks is a refinement pass, not a rewrite — completed work, story numbering, and `Status` are preserved.

**Use it:** once a spec is approved and you're ready to plan the implementation.

### `/implement <task-id-or-file>`

Implements **exactly one task** — never a whole story or module — via the `spec-implementer` agent, isolated in a git worktree.

- Resolves a task id (`T-2_US-1`), a story (`US-1`), or a bare module name to a specific `Not Started` task.
- Checks the task's dependencies and its story's `Status` before launching anything.
- Runs the agent in the background by default so several `/implement` calls (independent tasks) can proceed concurrently.
- Reports back what changed, the test that proves it, and the worktree branch — **it never merges, pushes, or touches your main working tree automatically.** Reviewing and merging is on you.

**Use it:** once a story's tasks are `Ready`, one task at a time (or several in parallel, if they don't depend on each other).

## The skill: `spec-to-stories`

A skill is where the *judgment-heavy* methodology lives — more than a command's prompt should carry, and reusable beyond just the `/user-stories` trigger. `spec-to-stories` encodes:

- How to word a story so it traces to a real spec Goal/Acceptance Criterion (and how to catch scope creep that doesn't).
- How to size a task (one sitting, one observable outcome) and phrase its TDD `Test:`/`Done when:` fields concretely.
- How to handle a re-run without clobbering completed work.
- The exact file/naming structure (`US-<N>-<title>.md`, `T-<T>_US-<N>-<title>.md`, `SHARED` tasks).

Splitting this out from the command means the same methodology could be invoked another way later (e.g. "break this down into stories" in plain conversation) without duplicating the instructions.

## The agent: `spec-implementer`

An agent gets its own context window, a restricted toolset, and — critically here — its own git worktree. That isolation is the point: it can write code and run commands without polluting the main conversation's context, and multiple instances can work on different tasks at the same time without stepping on each other's files.

Its loop, per task:

1. Read the task, its story, the module spec, and `CONVENTIONS.md` (so it reuses existing patterns instead of rediscovering the codebase from scratch every time).
2. Confirm dependencies are `Done`; refuse to guess around a gap.
3. **Strict red-green TDD:** write the test named in the task first, run it, confirm it fails for the right reason, only then implement until it passes.
4. Mark the task (and, if it was the last one, the story) `Done`.
5. If it introduced something genuinely new and reusable, append a short entry to `CONVENTIONS.md`.
6. Report back — never merges or pushes.

Tool access is scoped to `Read, Edit, Write, Bash, Grep, Glob` — no `Agent` (it can't spawn further agents) and no direct merge/push authority.

## How the pieces actually fit together

It helps to think of these as three different *mechanisms* for three different jobs:

- **Commands** are thin, explicit entry points — you type `/spec`, `/user-stories`, or `/implement` and get a specific, scoped action. They're the interface.
- **Skills** are where detailed, reusable methodology lives — loaded into context when triggered, so the reasoning behind *how* to do something (not just *that* it should happen) travels with the work. One skill can back a command, or be triggered by matching phrasing in plain conversation.
- **Agents** are where isolated *execution* happens — separate context, restricted tools, and (here) a separate git worktree, so implementation work doesn't bloat the main conversation and can run in parallel or in the background.
- **`CLAUDE.md` and `CONVENTIONS.md`** are cheap, persistent memory — short files read up front instead of re-deriving the same architectural facts by scanning the whole repo on every task.

The spec/stories/tasks files themselves are the actual contract between all of these — every command, skill, and agent reads and writes the same file structure, so none of them need to communicate through anything except the repo.

## Walkthrough: implementing the `auth` module

1. `specs/auth/spec.md` already exists and is `Approved` (no dependencies — good first module).
2. Run `/user-stories auth`. The `spec-to-stories` skill reads the spec and produces `specs/auth/stories/README.md`, story files (e.g. `US-1-register-and-login.md`, `US-2-session-guard.md`), and their task files (e.g. `T-1_US-1-add-user-prisma-model.md`, `T-2_US-1-hash-password-on-register.md`, ...), each with a concrete `Test:` field.
3. Run `/implement T-1_US-1-add-user-prisma-model`. The `spec-implementer` agent spins up in a worktree, writes a migration test, watches it fail, adds the Prisma model, watches it pass, marks the task `Done`, and reports the worktree branch.
4. Review that diff, merge it.
5. Run `/implement T-2_US-1-...` next — and, since it doesn't depend on unrelated work elsewhere, you could also kick off a task from `US-2` in parallel in a separate worktree at the same time.
6. Once every task under a story is `Done`, its `README.md` row and the story's own `Status` flip to `Done` automatically as part of the last task's completion.

## Best practices

- **Don't skip a stage.** Implementing against a `Draft` spec or a story that isn't `Ready` means building on a decision that might still change — the gates exist so that doesn't happen quietly.
- **One task per `/implement` call.** This is what makes the worktree-isolation and parallelism actually safe; asking the agent to "just do the whole story" defeats the granularity the whole file structure was designed around.
- **Fix the spec, don't route around it.** If a task or story turns out to be wrong or incomplete mid-implementation, stop and update the spec (or flag it) — don't silently implement something else because it seemed reasonable.
- **Trust the `Status` fields, not the code's appearance.** A task isn't `Done` until its test passes red-green — "the code looks right" isn't the bar.
- **Let `CONVENTIONS.md` do its job.** Read it before implementing instead of grepping the repo cold; update it after introducing something genuinely reusable so the next task benefits. Don't let it go stale by skipping that step.
- **Always review before merging.** No command or agent here merges or pushes automatically, by design — treat every worktree branch as a PR-sized diff to actually read.
- **Keep tasks small.** If a task can't be described with one concrete test, it's too big — split it in `/user-stories` rather than letting the implementer improvise scope.
- **Parallelize along the dependency graph, not against it.** Two tasks in different stories are usually safe to run at once; two tasks in the same story rarely are — check what each depends on before firing off several `/implement` calls together.
