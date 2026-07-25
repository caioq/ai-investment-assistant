---
name: spec-to-stories
description: Break an approved module spec (specs/<module>/spec.md) into user stories and individual per-task files under specs/<module>/stories/ and specs/<module>/tasks/. Use whenever the /user-stories command runs, or when asked to break a spec down into stories/tasks.
---

# Spec → Stories & Tasks

This is stage 2 of this repo's spec-driven workflow (`spec.md` → stories/tasks → implementation — see `CLAUDE.md`). Input is one module's `specs/<module>/spec.md`; output is one file per story and **one file per individual task** — not a checklist bundled into a bigger file:

```
specs/<module>/
  stories/
    README.md                                 # index — every story, title, status, task count
    US-1-<short-us-title>.md
    US-2-<short-us-title>.md
  tasks/
    T-1_US-1-<short-task-title>.md
    T-2_US-1-<short-task-title>.md
    T-1_US-2-<short-task-title>.md
    T-1_SHARED-<short-task-title>.md          # cross-cutting, not owned by one story
```

Templates: `specs/_templates/stories-readme.md`, `specs/_templates/story.md`, `specs/_templates/task.md`.

Task numbering (`T-<T>`) restarts within each story (and within the `SHARED` group) — it is not global across the module.

One file per task, instead of a checklist inside a story file, is deliberate: it keeps what `/implement` has to load down to exactly one task's context when working at that granularity, and lets independent tasks (even across different stories) be picked up or parallelized without one shared file becoming a bottleneck or merge conflict.

## Before writing anything

1. The spec must be `Approved`. If it's `Draft`, stop and tell the user — don't write stories against a spec that might still change.
2. Read the full spec, not just the Goals section — Non-Goals and Behavior Notes often constrain how a story should be worded (e.g. a Non-Goal rules out a story someone might otherwise assume belongs here).
3. If `specs/<module>/stories/` already has files, this is a re-run (spec changed, or a previous pass left things unfinished). Read the existing `README.md` and every story/task file before writing anything. Preserve:
   - Story and task numbering (don't renumber existing ones just because order changed).
   - Any task whose `Status` is already `In Progress` or `Done` — never regress it or silently drop it.
   - A story's `Status` — don't move it backwards.
   Add new stories/tasks, or edit specific ones the user flagged, rather than regenerating every file from scratch.

## Writing user stories

- Every story traces to a specific Goal or Acceptance Criterion in the spec (recorded in its `**Traces to:**` line). If you can't point to which one, it doesn't belong — either it's spec scope creep (flag it, don't quietly add it) or it genuinely needs a spec update first.
- One story = one coherent slice of user-visible or system behavior, not one API endpoint and not one database table. "As a user, I want to upload a CSV of holdings" is a story; "as a user, I want a `Holding` Prisma model" is not — that's a task inside a story.
- Keep stories independently valuable where the spec allows it — a story shouldn't secretly depend on three others being done first unless the spec's own dependency graph requires it.
- Non-functional acceptance criteria from the spec (auth scoping, error handling, rate-limit batching, etc.) become tasks under the story they protect, not a story of their own — nobody wants "As a user, I want auth checks."
- File name: `US-<N>-<short-kebab-title>.md` under `stories/`. Every story file's `## Tasks` section is a checklist of links to its task files (see below) — check a box only when that task file's own `Status` is `Done`.
- Update `stories/README.md`'s table every time a story is added, removed, or its status changes.

## Writing tasks

- One file per task: `tasks/T-<T>_US-<N>-<short-kebab-title>.md`, or `tasks/T-<T>_SHARED-<short-kebab-title>.md` for work shared by more than one story (referenced from every story it serves, never duplicated).
- Each task should be small enough to implement and verify in one sitting. Every task is TDD-scoped: its `**Test:**` field names the specific test (file + what it asserts) that defines "done," and `**Done when:**` is always that test passing via red-green (write it, confirm it fails for the right reason, then implement) — never a vague "implemented correctly."
  - Follow the testing conventions already recorded in `CONVENTIONS.md` for that area of the codebase (fixture location, unit vs. integration setup). If nothing is recorded yet — likely for the first few tasks ever written — propose a file path consistent with the stack (Jest specs under `apps/api`, Vitest/RTL under `apps/web`) and the spec's own Testing/Acceptance Criteria language.
  - A task's test should be concrete enough that two different people would write the same test from reading it — not "add tests for the endpoint."
- Order tasks the way you'd actually build a story: schema/migration first, then service logic, then endpoint wiring, then UI. Each still carries its own test — don't defer all testing to one task at the end.
- Reference concrete names from the spec (model fields, endpoint paths, component names) — a task that says "add the allocation endpoint" when the spec already names it `GET /portfolio/allocation` should say that, not force whoever implements it to go re-read the spec to find the name.

## After writing

- Cross-check: does every Acceptance Criterion in the spec map to at least one task file somewhere (under a story or under `SHARED`)? If not, either add the task or flag the gap to the user — a spec AC with no corresponding task is a silent scope drop.
- Set each story's `Status` to `Ready` once its task breakdown looks implementable as-is; leave it `Draft` and say why if something in the spec was too vague to break down cleanly (that's a sign the spec needs another pass, not that you should guess).

## Creating GitHub issues for tasks

This repo tracks tasks on a GitHub Project board (see `CONVENTIONS.md` → "GitHub issue / project sync" for the repo and project reference) in addition to the task files. Every task file — never story files — gets a mirrored GitHub issue:

1. Confirm the `github` MCP server is connected. If it isn't available in this session, tell the user and skip this section rather than failing the whole run — the story/task files are still valid output on their own; issue creation can be done as a follow-up pass once MCP is reachable.
2. Discover the current GitHub MCP tool names via `ToolSearch` (queries like `"github issue"`, `"github project"`) — don't assume fixed names, the server's toolset can change between versions.
3. For each newly-created task file with no existing `**GitHub Issue:**` number:
   - Create an issue in the repo named in `CONVENTIONS.md`. Title: `[T-<T>] <task short title> (US-<N>)` (or `(SHARED)` for cross-cutting tasks). Body: the task's one/two-sentence description, its `**Test:**` and `**Done when:**` fields verbatim, and a relative link back to the task file so anyone opening the issue can find the full context.
   - Label it with the module name (e.g. `module:portfolio`) and `task`; create the label first if it doesn't already exist in the repo.
   - Write the returned issue number back into that task file's `**GitHub Issue:**` field.
   - Leave the issue's Project status at its default column (To Do / Backlog) — `/implement` is what moves it to In Progress / In Review later.
4. For a re-run over tasks that already have a `**GitHub Issue:**` number: update the existing issue's title/body if the task file changed, don't create a duplicate.
5. If issue creation fails partway (rate limit, missing label permission, etc.), report exactly which task files got an issue and which didn't — don't silently leave some task files pointing at issues and others not, since that's confusing for whoever looks at the board next.
