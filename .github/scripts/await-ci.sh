#!/usr/bin/env bash
# Block until this commit's CI `build` job has concluded, so the AI review
# only spends tokens on a PR whose tests actually pass.
#
# Why poll check-runs instead of `gh pr checks --watch`: the review workflow is
# itself a check on the same PR, so `--watch` would wait on a set that includes
# the caller and deadlock until timeout. This waits on one named job only.
#
# Writes ci=success|failure|timeout to $GITHUB_OUTPUT. Never fails the step --
# the caller decides what to do with each outcome (a red CI should skip the
# review quietly, not add a second red X to a PR that already has one).
#
# Usage: await-ci.sh <head-sha> [check-run-name]
set -uo pipefail

SHA="$1"
CHECK_NAME="${2:-build}"
ATTEMPTS="${CI_WAIT_ATTEMPTS:-60}"
SLEEP_SECONDS="${CI_WAIT_SLEEP:-20}"
REPO="${GITHUB_REPOSITORY}"

emit() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "ci=$1" >>"$GITHUB_OUTPUT"
  fi
  echo "ci=$1"
}

# ci.yml triggers on both `push` and `pull_request`, so a PR commit carries TWO
# check runs named `build`. Reading just the first races them: one can be green
# while the other is still running. Every matching run must be completed, and
# all of them must have succeeded.
for attempt in $(seq 1 "$ATTEMPTS"); do
  runs=$(gh api "repos/$REPO/commits/$SHA/check-runs" --paginate \
    --jq ".check_runs[] | select(.name == \"$CHECK_NAME\") | [.status, (.conclusion // \"\")] | @tsv" 2>/dev/null || true)

  if [ -z "$runs" ]; then
    echo "Attempt $attempt/$ATTEMPTS: no '$CHECK_NAME' check run on $SHA yet."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  total=$(echo "$runs" | grep -c . || true)
  pending=$(echo "$runs" | grep -vc '^completed' || true)
  failed=$(echo "$runs" | awk -F'\t' '$1 == "completed" && $2 != "success"' | wc -l | tr -d ' ')

  if [ "$failed" -gt 0 ]; then
    echo "CI '$CHECK_NAME' has $failed non-success conclusion(s) for $SHA -- skipping review."
    emit failure
    exit 0
  fi

  if [ "$pending" -eq 0 ]; then
    echo "All $total '$CHECK_NAME' check run(s) succeeded for $SHA (attempt $attempt)."
    emit success
    exit 0
  fi

  echo "Attempt $attempt/$ATTEMPTS: $pending of $total '$CHECK_NAME' run(s) still pending."
  sleep "$SLEEP_SECONDS"
done

echo "::warning::CI '$CHECK_NAME' had not concluded for $SHA after $((ATTEMPTS * SLEEP_SECONDS))s -- skipping review."
emit timeout
exit 0
