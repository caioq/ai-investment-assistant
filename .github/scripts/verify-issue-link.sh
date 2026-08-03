#!/usr/bin/env bash
# Check whether a PR's `Closes #<issue>` keyword has actually registered as a
# real linked issue (GitHub's Development-sidebar link, exposed in GraphQL as
# `pullRequest.closingIssuesReferences`).
#
# GitHub only registers the keyword while the PR's base is the repo's default
# branch, and the registration is asynchronous -- so this polls rather than
# reading once. See CONVENTIONS.md -> "PR <-> issue linking".
#
# Requires: gh CLI, authenticated (the default GITHUB_TOKEN is enough).
#
# Usage: verify-issue-link.sh <pr-number> <issue-number>
# Exit 0 if the issue is linked, 1 if it still isn't after the poll window.

set -euo pipefail

PR_NUMBER="$1"
ISSUE_NUMBER="$2"
OWNER="${REPO_OWNER:-${GITHUB_REPOSITORY%%/*}}"
NAME="${REPO_NAME:-${GITHUB_REPOSITORY##*/}}"
ATTEMPTS="${LINK_CHECK_ATTEMPTS:-5}"
SLEEP_SECONDS="${LINK_CHECK_SLEEP:-3}"

for attempt in $(seq 1 "$ATTEMPTS"); do
  linked=$(gh api graphql \
    -f query='query($owner:String!,$name:String!,$pr:Int!){
      repository(owner:$owner,name:$name){
        pullRequest(number:$pr){ closingIssuesReferences(first:20){ nodes{ number } } }
      }
    }' \
    -F owner="$OWNER" -F name="$NAME" -F pr="$PR_NUMBER" \
    --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[].number' || true)

  if echo "$linked" | grep -qx "$ISSUE_NUMBER"; then
    echo "PR #$PR_NUMBER is linked to issue #$ISSUE_NUMBER (attempt $attempt)."
    exit 0
  fi

  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo "PR #$PR_NUMBER is NOT linked to issue #$ISSUE_NUMBER after $ATTEMPTS attempts." >&2
exit 1
