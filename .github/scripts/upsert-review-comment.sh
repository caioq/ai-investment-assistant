#!/usr/bin/env bash
# Post the AI review as a single issue comment on the PR, editing the same
# comment in place on every re-run instead of appending a new one.
#
# The review re-runs on every push to the PR branch, so appending would leave a
# PR carrying five stale verdicts with no indication which one is current. One
# comment, always the latest review. The HTML marker below is how the existing
# comment is found -- don't change it without a migration, or every open PR
# gets a second comment thread.
#
# Usage: upsert-review-comment.sh <pr-number> <body-file>
set -euo pipefail

PR_NUMBER="$1"
BODY_FILE="$2"
REPO="${GITHUB_REPOSITORY}"
MARKER="<!-- ai-pr-review -->"

body=$(cat "$BODY_FILE")
printf '%s\n\n%s\n' "$MARKER" "$body" >/tmp/ai-comment-body.md

existing=$(gh api "repos/$REPO/issues/$PR_NUMBER/comments" --paginate \
  --jq "[.[] | select(.body | startswith(\"$MARKER\"))] | first | .id // empty" || true)

if [ -n "$existing" ]; then
  gh api --method PATCH "repos/$REPO/issues/comments/$existing" \
    -F body=@/tmp/ai-comment-body.md >/dev/null
  echo "Updated existing AI review comment ($existing) on PR #$PR_NUMBER."
else
  gh api --method POST "repos/$REPO/issues/$PR_NUMBER/comments" \
    -F body=@/tmp/ai-comment-body.md >/dev/null
  echo "Posted a new AI review comment on PR #$PR_NUMBER."
fi
