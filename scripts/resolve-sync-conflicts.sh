#!/usr/bin/env bash

# Resolve the merge conflicts that recur every time upstream is synced into
# this fork.  Only files whose content is deliberately forked are handled;
# anything else is left unresolved so the caller can fail the job.
#
#   README.md   - fully rewritten in English here and regenerated from
#                 README.en.md by scripts/enforce-no-chinese.sh, so the local
#                 version always wins.
#   1710.config / 2010.config
#               - share most of their content with upstream.  Only the hunks
#                 that actually conflict are resolved in favour of the local
#                 build configuration; non-conflicting upstream additions such
#                 as newly introduced packages are kept.
#
# On top of that, every file that scripts/enforce-no-chinese.sh deletes here
# (Chinese translation catalogues and locale directories) comes back as a
# modify/delete conflict as soon as upstream touches it.  Those deletions are
# re-applied automatically, because re-adding the file would only make the
# no-Chinese check fail in the next step.

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

# A conflicting path that no longer exists on our side was removed on purpose
# by the no-Chinese policy.  Upstream keeps editing those files (translation
# catalogues in particular), which produces a modify/delete conflict on every
# sync.  Keep the deletion whenever the upstream version still carries Chinese
# text, so the resolution can never re-introduce content that the following
# enforcement step would reject anyway.
keep_policy_deletions() {
  local path

  while IFS= read -r path; do
    [ -n "$path" ] || continue

    # Stage 2 present means our side still has the file, so this is a content
    # conflict that needs a real decision rather than a deletion.
    git show ":2:$path" > /dev/null 2>&1 && continue

    if git show ":3:$path" 2>/dev/null |
       LC_ALL=C.UTF-8 grep -q -P '[\x{3000}-\x{303f}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}\x{ff01}-\x{ff60}]'; then
      echo "Keeping local deletion of Chinese file: $path"
      git rm -q -f -- "$path"
    fi
  done < <(git diff --name-only --diff-filter=U)
}

take_ours README.md
keep_policy_deletions
merge_hunks_preferring_ours 1710.config
merge_hunks_preferring_ours 2010.config
