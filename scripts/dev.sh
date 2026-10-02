#!/usr/bin/env bash
# Wraps `pnpm -r --parallel run dev` so a broken/stacked NODE_OPTIONS (see
# sanitize-node-options.sh) can't take down apps/web's or apps/api's dev
# server before it even starts.
set -euo pipefail
cd "$(dirname "$0")/.."

source scripts/sanitize-node-options.sh

exec pnpm -r --parallel run dev
