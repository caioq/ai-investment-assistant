#!/usr/bin/env bash
# Cheap, deterministic pre-check for the auto-implement-issues workflow.
# Resolves open GitHub issues to specs/**/tasks/*.md files without invoking
# Claude, so the expensive claude-code-action job only runs when there's a
# genuine, not-already-in-flight candidate. Writes has_candidate/task_file/
# issue_number to $GITHUB_OUTPUT and a human-readable breakdown to
# $GITHUB_STEP_SUMMARY.
set -uo pipefail

{
  echo "## Auto-implement check — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
} >>"$GITHUB_STEP_SUMMARY"

open_issues_json=$(gh issue list --state open --limit 100 --json number,title,url)
if [ -z "$open_issues_json" ]; then
  echo "**Preflight failed:** could not list open issues via gh CLI." >>"$GITHUB_STEP_SUMMARY"
  echo "has_candidate=false" >>"$GITHUB_OUTPUT"
  exit 0
fi

mapfile -t issue_numbers < <(echo "$open_issues_json" | jq -r '.[].number')

declare -A issue_title
while IFS=$'\t' read -r number title; do
  [ -n "$number" ] && issue_title["$number"]="$title"
done < <(echo "$open_issues_json" | jq -r '.[] | [.number, .title] | @tsv')

# issue number -> matching task file (if any)
declare -A issue_task_file
for number in "${issue_numbers[@]:-}"; do
  [ -z "$number" ] && continue
  match=$(grep -rlE "\*\*GitHub Issue:\*\* #${number}([^0-9]|\$)" specs/*/tasks 2>/dev/null | head -n1)
  [ -n "$match" ] && issue_task_file["$number"]="$match"
done

task_status() {
  grep -m1 -E '^\*\*Status:\*\*' "$1" 2>/dev/null | sed -E 's/^\*\*Status:\*\* *//'
}

# 0 = in flight (open PR or branch exists), 1 = clear, 2 = check itself failed (treat as unknown)
branch_in_flight() {
  local branch="$1" pr_count
  pr_count=$(gh pr list --state open --head "$branch" --json number --jq 'length' 2>/dev/null)
  [ -z "$pr_count" ] && return 2
  [ "$pr_count" != "0" ] && return 0
  git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 && return 0
  return 1
}

candidates=() # "issue_number:task_file"
for number in "${!issue_task_file[@]}"; do
  file="${issue_task_file[$number]}"
  [ "$(task_status "$file")" != "Not Started" ] && continue
  branch="task/$(basename "$file" .md)"
  branch_in_flight "$branch"
  rc=$?
  [ "$rc" != "1" ] && continue # 0 = in flight, 2 = unknown -> skip conservatively either way
  candidates+=("${number}:${file}")
done

unmanaged=()
for number in "${issue_numbers[@]:-}"; do
  [ -z "$number" ] && continue
  if [ -z "${issue_task_file[$number]:-}" ]; then
    unmanaged+=("#${number} ${issue_title[$number]:-}")
  fi
done

stuck=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ "$(task_status "$file")" != "In Progress" ] && continue
  branch="task/$(basename "$file" .md)"
  branch_in_flight "$branch"
  rc=$?
  [ "$rc" = "1" ] && stuck+=("$file") # clear of any branch/PR despite being In Progress -> likely orphaned
done < <(find specs -path '*/tasks/*.md' 2>/dev/null)

best_number=""
best_file=""
for entry in "${candidates[@]:-}"; do
  [ -z "$entry" ] && continue
  n="${entry%%:*}"
  f="${entry#*:}"
  if [ -z "$best_number" ] || [ "$n" -lt "$best_number" ]; then
    best_number="$n"
    best_file="$f"
  fi
done

{
  echo "**Eligible candidates found:** ${#candidates[@]}"
  if [ -n "$best_file" ]; then
    echo "**Selected:** issue #${best_number} -> ${best_file}"
  fi
  echo ""
  echo "**Unmanaged open issues (no matching task file):** ${#unmanaged[@]}"
  for u in "${unmanaged[@]:-}"; do echo "- $u"; done
  echo ""
  echo "**Possibly stuck tasks (In Progress, no branch/PR found):** ${#stuck[@]}"
  for s in "${stuck[@]:-}"; do echo "- $s"; done
} >>"$GITHUB_STEP_SUMMARY"

if [ -n "$best_file" ]; then
  echo "has_candidate=true" >>"$GITHUB_OUTPUT"
  echo "task_file=${best_file}" >>"$GITHUB_OUTPUT"
  echo "issue_number=${best_number}" >>"$GITHUB_OUTPUT"
else
  echo "has_candidate=false" >>"$GITHUB_OUTPUT"
fi
