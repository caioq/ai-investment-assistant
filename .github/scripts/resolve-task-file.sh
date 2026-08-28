#!/usr/bin/env bash
# Resolve the specs/**/tasks/*.md file a pull request implements, so the AI
# review can be scoped to that task's own acceptance criteria rather than being
# a generic "review this code" pass.
#
# Two resolution paths, in order:
#   1. Branch name. CONVENTIONS.md -> "Branching, pushing, and PRs per task"
#      fixes the branch as `task/<task-file-basename>` (the task file's own
#      basename minus `.md`), which makes this an exact filename lookup.
#   2. PR title. spec-implementer titles PRs `[<task-id>] <short title>`, so a
#      hand-renamed branch still resolves via the id prefix.
#
# A PR that matches neither is not a task PR (a hotfix, a spec edit, a manual
# change) -- that's a normal outcome, not an error: it writes has_task=false
# and exits 0 so the caller can skip the review rather than fail the run.
#
# Writes has_task/task_file/task_id to $GITHUB_OUTPUT when running in Actions.
#
# Usage: resolve-task-file.sh <head-branch> [pr-title]
set -uo pipefail

BRANCH="${1:-}"
PR_TITLE="${2:-}"

emit() {
  # $1 = has_task, $2 = task_file, $3 = task_id
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
      echo "has_task=$1"
      echo "task_file=$2"
      echo "task_id=$3"
    } >>"$GITHUB_OUTPUT"
  fi
  echo "has_task=$1 task_file=$2 task_id=$3"
}

# 1. Branch name -> exact task file basename.
basename_candidate="${BRANCH#task/}"
if [ -n "$basename_candidate" ] && [ "$basename_candidate" != "$BRANCH" ]; then
  match=$(find specs -type f -path '*/tasks/*' -name "${basename_candidate}.md" | head -1)
  if [ -n "$match" ]; then
    # Task id is the basename up to the last `-<short-title>` segment: ids look
    # like MODULE_US-N_T-T or MODULE_SHARED_T-T, always underscore-joined.
    task_id=$(basename "$match" .md | grep -oE '^[A-Z0-9_]+_(US-[0-9]+_)?T-[0-9]+' || true)
    emit true "$match" "$task_id"
    exit 0
  fi
  echo "Branch '$BRANCH' looks like a task branch but no specs/**/tasks/${basename_candidate}.md exists." >&2
fi

# 2. PR title -> `[<task-id>] ...`.
task_id=$(echo "$PR_TITLE" | grep -oE '^\[[A-Za-z0-9_-]+\]' | tr -d '[]' || true)
if [ -n "$task_id" ]; then
  match=$(find specs -type f -path '*/tasks/*' -name "${task_id}-*.md" | head -1)
  if [ -n "$match" ]; then
    emit true "$match" "$task_id"
    exit 0
  fi
  echo "PR title names task '$task_id' but no matching specs/**/tasks/ file exists." >&2
fi

echo "No task file resolved for branch '$BRANCH' / title '$PR_TITLE' -- not a task PR."
emit false "" ""
exit 0
