# <Module Name> — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-<short-us-title>.md) | <short title> | Draft \| Ready \| In Progress \| Done | T-1..T-N in `../tasks/` |

<!-- One row per story, in implementation order where an order is implied by the spec's dependencies. -->

## Cross-cutting tasks

Work shared by more than one story (schema/migration shared by several stories, shared test fixtures, etc.) lives in `../tasks/T-<T>_SHARED-<short-task-title>.md`, referenced by every story it serves — never duplicated per story.

## Out of scope for this pass

Anything from the spec's Goals deliberately deferred to a later pass through `/user-stories` on this module. Leave empty if nothing was deferred.
