#!/usr/bin/env bash
# Move a task's linked GitHub issue to a given Status column on the
# user-owned Project board (github.com/users/$PROJECT_OWNER/projects/$PROJECT_NUMBER).
#
# Requires: gh CLI, authenticated with a PAT that has `project` scope --
# the default GITHUB_TOKEN cannot write to a user-owned Projects v2 board.
# See CONVENTIONS.md -> "GitHub issue / project sync".
#
# Usage: move-project-card.sh <issue-number> <status-option-name>
# Example: move-project-card.sh 42 "In Review"

set -euo pipefail

ISSUE_NUMBER="$1"
STATUS_OPTION="$2"
PROJECT_OWNER="${PROJECT_OWNER:-caioq}"
PROJECT_NUMBER="${PROJECT_NUMBER:-2}"

project_id=$(gh project view "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json | jq -r '.id')

item_id=$(gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json --limit 200 \
  | jq -r --argjson num "$ISSUE_NUMBER" '.items[] | select(.content.number == $num) | .id')

# `item-list` misses an item in two cases: the issue was never added to the
# board, and — seen for issues #308-#328 — the item exists (resolvable by id,
# not archived, Status set) but never appears in the project's own listing.
# `item-add` covers both: it is idempotent, returning the existing item's id
# when there is one, so it repairs the first case and sidesteps the second.
if [ -z "$item_id" ]; then
  repo="${GITHUB_REPOSITORY:-caioq/ai-investment-assistant}"
  item_id=$(gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" \
    --url "https://github.com/$repo/issues/$ISSUE_NUMBER" --format json 2>/dev/null | jq -r '.id // empty')
fi

if [ -z "$item_id" ]; then
  echo "No project item found for issue #$ISSUE_NUMBER, and adding it to project $PROJECT_NUMBER failed -- does GH_TOKEN carry the 'project' scope? See CONVENTIONS.md." >&2
  exit 1
fi

fields_json=$(gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json)
field_id=$(echo "$fields_json" | jq -r '.fields[] | select(.name == "Status") | .id')
option_id=$(echo "$fields_json" | jq -r --arg opt "$STATUS_OPTION" '.fields[] | select(.name == "Status") | .options[] | select(.name | ascii_downcase == ($opt | ascii_downcase)) | .id')

if [ -z "$field_id" ] || [ -z "$option_id" ]; then
  echo "Couldn't resolve the Status field or the '$STATUS_OPTION' option on project $PROJECT_NUMBER -- has the field been renamed? See CONVENTIONS.md." >&2
  exit 1
fi

gh project item-edit --id "$item_id" --field-id "$field_id" --project-id "$project_id" --single-select-option-id "$option_id"
echo "Moved issue #$ISSUE_NUMBER to '$STATUS_OPTION'."
