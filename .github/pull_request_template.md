<!--
Review-oriented PR body. Bullets only, except the short Description.
The goal is to tell the reviewer where to look and what to distrust, not to restate the task file.
Delete a section's placeholder text once it's filled in. Leave "None" where a section genuinely has nothing.
-->

## 🎯 Task
<!-- ABSOLUTE link to the task file. Relative links in a PR body don't resolve to repo files (they land on a compare page).
Prefer a permalink pinned to the PR's head commit so it survives the branch being deleted:
https://github.com/caioq/ai-investment-assistant/blob/<head-commit-sha>/specs/<module>/tasks/<TASK_ID>-<title>.md
Then the linked issue: keep the exact "Closes #N" form, since the link-and-track-pr workflow parses it. -->
[<TASK_ID> — <task title>](https://github.com/caioq/ai-investment-assistant/blob/<head-commit-sha>/specs/<module>/tasks/<TASK_ID>-<title>.md)
Closes #<issue>

## 📄 Description
<!-- 1–2 plain sentences: what this PR does and why, so a reviewer has the gist before the details. -->

## 📝 What changed
<!-- 2–4 bullets describing behavior, not a list of files. -->
-

## 🔍 Review focus
<!-- Every changed file in one of three tiers, most important first, with what to check. -->
- 🔍 **Read carefully:** `path/to/file.ts` → <the logic that matters / what could be wrong>
- 👀 **Skim:** <tests, mocks, small wiring changes>
- ⏭️ **Skip:** <Status flips, CONVENTIONS.md notes, generated files, snapshot/baseline binaries>

## ⚠️ Assumptions / deviations from spec
<!-- Every decision the spec/task didn't dictate: extra behavior, unspecified edge-case handling, extra tests, things left out of scope. Write "None" only if there truly are none. -->
-

## ✅ Tests
<!-- The task's Test: field mapped to real test names. Mark tests beyond the task's list as *(extra)*. -->
- Task `Test:` → `path/to/file.test.ts`
  - <test name>
- Run: `pnpm --filter <package> test <pattern>`

## 📸 Evidence
<!-- UI changes only; otherwise write "N/A — no UI change".
Point at committed Playwright visual baselines (GitHub's "Rich diff" shows before/after), or drag in screenshots/GIFs by hand. -->
- N/A — no UI change

## 🧱 Stacked on
<!-- Only if the base isn't main: which dependency PR must merge first, and which commits/files are new to this PR. Otherwise delete this section. -->
