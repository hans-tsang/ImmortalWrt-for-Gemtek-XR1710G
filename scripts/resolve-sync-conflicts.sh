#!/usr/bin/env bash

# Resolve the merge conflicts that recur every time upstream is synced into
# this fork.  Only files whose content is deliberately forked are handled;
# anything else is left unresolved so the caller can fail the job.
#
#   README.md   - fully rewritten in English here and regenerated from
#                 README.en.md by scripts/enforce-no-chinese.sh, so the local
#                 version always wins.
#   config.seed - shares most of its content with upstream.  Only the hunks
#                 that actually conflict are resolved in favour of the local
#                 build configuration; non-conflicting upstream additions such
#                 as newly introduced packages are kept.

set -euo pipefail

ROOT_DIR="${1:-.}"
cd "$ROOT_DIR"

is_unmerged() {
  git ls-files --unmerged -- "$1" | grep -q .
}

take_ours() {
  local path="$1"
  is_unmerged "$path" || return 0
  git checkout --ours -- "$path"
  git add -- "$path"
}

merge_hunks_preferring_ours() {
  local path="$1"
  is_unmerged "$path" || return 0

  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  # Stage 1/2/3 are base/ours/theirs.  A missing stage means the file was
  # added or deleted on one side, which cannot be merged hunk-wise.
  if ! git show ":1:$path" > "$tmp/base" 2>/dev/null ||
     ! git show ":2:$path" > "$tmp/ours" 2>/dev/null ||
     ! git show ":3:$path" > "$tmp/theirs" 2>/dev/null; then
    return 0
  fi

  git merge-file --ours -p "$tmp/ours" "$tmp/base" "$tmp/theirs" > "$path"
  git add -- "$path"
}

take_ours README.md
merge_hunks_preferring_ours config.seed
