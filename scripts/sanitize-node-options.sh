#!/usr/bin/env bash
# Strips VS Code's js-debug auto-attach `--require ".../bootloader.js"`
# entries out of NODE_OPTIONS before dev/bootstrap spawn any node process.
#
# VS Code's "Debug: Auto Attach" injects one of these into every integrated
# terminal so it can attach a debugger to any node process launched there.
# Reopening/reloading windows over time can leave more than one stacked in
# NODE_OPTIONS; when that survives pnpm re-spawning a child process (e.g.
# `pnpm -r --parallel run dev` -> `next dev`), the quoting around the paths
# (which contain spaces, e.g. "Application Support") gets lost and Node
# throws MODULE_NOT_FOUND before the dev server ever starts.
#
# Only vscode-js-debug entries are removed -- anything else already in
# NODE_OPTIONS (a developer's own flags) is left untouched. Source this,
# don't execute it, so the export reaches the caller's shell.
sanitize_node_options() {
  local raw="${NODE_OPTIONS:-}"
  if [[ -z "$raw" ]]; then
    return
  fi
  # NODE_OPTIONS= clears it for this one `node` invocation, and the original
  # value is passed through a differently-named var instead -- otherwise a
  # stale/broken --require path (e.g. a workspaceStorage dir VS Code already
  # deleted) makes this very node call fail with the same MODULE_NOT_FOUND
  # we're trying to fix, before it ever reaches the script below.
  export NODE_OPTIONS="$(NODE_OPTIONS= _RAW_NODE_OPTIONS="$raw" node -e '
    const raw = process.env._RAW_NODE_OPTIONS || "";
    const tokens = raw.match(/--require\s+"[^"]*"|--require\s+\S+|\S+/g) || [];
    const kept = tokens.filter((t) => !/--require\s+.*ms-vscode\.js-debug[\/\\]bootloader\.js/.test(t));
    process.stdout.write(kept.join(" ").trim());
  ')"
}

sanitize_node_options
