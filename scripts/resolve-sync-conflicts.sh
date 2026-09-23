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
#
# The remaining two recurring classes of conflicts are handled generically:
#
#   * Upstream removes or renames a whole package that this fork only touched
#     to translate its user-visible strings.  Keeping our copy would resurrect
#     a package upstream no longer ships, so the removal is accepted.
#   * Upstream translates a file that we had already translated.  When the
#     merge base still contains Chinese and the upstream version does not, the
#     local change was only a translation of the very same text, so the
#     upstream wording is taken and the divergence disappears.

set -euo pipefail

ROOT_DIR="${1:-.}"
cd "$ROOT_DIR"

is_unmerged() {
  git ls-files --unmerged -- "$1" | grep -q .
}

# Lists the still conflicting paths.  The list is materialised completely
# before it is used, because `git diff` refreshes and rewrites the index: when
# it is read through a pipe or a process substitution it is still running while
# the loop body calls `git rm`/`git add`, and both processes then fight over
# .git/index.lock.
unmerged_paths() {
  git ls-files --unmerged | awk '{ print $4 }' | sort -u
}

# Reads a file from stdin and succeeds when it contains CJK ideographs or
# CJK/full-width punctuation.  The pattern only compiles in a UTF-8 locale.
has_chinese() {
  LC_ALL=C.UTF-8 grep -q -a -P '[\x{3000}-\x{303f}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}\x{ff01}-\x{ff60}]'
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

  # Stage 1/2/3 are base/ours/theirs.  A missing stage means the file was
  # added or deleted on one side, which cannot be merged hunk-wise.
  if ! git show ":1:$path" > "$tmp/base" 2>/dev/null ||
     ! git show ":2:$path" > "$tmp/ours" 2>/dev/null ||
     ! git show ":3:$path" > "$tmp/theirs" 2>/dev/null; then
    rm -rf "$tmp"
    return 0
  fi

  git merge-file --ours -p "$tmp/ours" "$tmp/base" "$tmp/theirs" > "$path"
  git add -- "$path"
  rm -rf "$tmp"
}

# A conflicting path that no longer exists on our side was removed on purpose
# by the no-Chinese policy.  Upstream keeps editing those files (translation
# catalogues in particular), which produces a modify/delete conflict on every
# sync.  Keep the deletion whenever the upstream version still carries Chinese
# text, so the resolution can never re-introduce content that the following
# enforcement step would reject anyway.
keep_policy_deletions() {
  local path paths
  paths="$(unmerged_paths)"

  while IFS= read -r path; do
    [ -n "$path" ] || continue

    # Stage 2 present means our side still has the file, so this is a content
    # conflict that needs a real decision rather than a deletion.
    git show ":2:$path" > /dev/null 2>&1 && continue

    if git show ":3:$path" 2>/dev/null | has_chinese; then
      echo "Keeping local deletion of Chinese file: $path"
      git rm -q -f -- "$path"
    fi
  done <<< "$paths"
}

# True when one of the path's ancestor directories exists on our side but was
# removed on the upstream side, i.e. upstream dropped or renamed a whole
# directory instead of editing the single file.
upstream_removed_tree() {
  local dir
  dir="$(dirname "$1")"

  while [ "$dir" != "." ] && [ "$dir" != "/" ]; do
    if git rev-parse --quiet --verify "HEAD:$dir" > /dev/null 2>&1 &&
       ! git rev-parse --quiet --verify "MERGE_HEAD:$dir" > /dev/null 2>&1; then
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  return 1
}

# Upstream regularly merges or renames packages.  Every file of such a package
# that this fork touched (to translate its user-visible strings) then shows up
# as a modify/delete conflict with the upstream side missing.  Keeping our copy
# would resurrect a package that upstream no longer builds, so the removal is
# accepted whenever the whole directory disappeared upstream.
accept_upstream_removals() {
  local path paths

  git rev-parse --quiet --verify MERGE_HEAD > /dev/null 2>&1 || return 0
  paths="$(unmerged_paths)"

  while IFS= read -r path; do
    [ -n "$path" ] || continue

    # Stage 3 present means upstream still ships the file, stage 2 missing
    # means we deleted it ourselves; neither case belongs here.
    if git show ":3:$path" > /dev/null 2>&1; then
      continue
    fi
    if ! git show ":2:$path" > /dev/null 2>&1; then
      continue
    fi

    if upstream_removed_tree "$path"; then
      echo "Accepting upstream removal of $path"
      git rm -q -f -- "$path"
    fi
  done <<< "$paths"
}

# The fork translates the user-visible strings of the local LuCI applications.
# Once upstream translates the same file, both sides rewrite the same lines and
# every sync conflicts again.  When the merge base still carries Chinese text
# and neither side does any more, the local change was only a translation of
# that text, so the upstream wording is taken and the files stop diverging.
take_upstream_translations() {
  local path paths
  paths="$(unmerged_paths)"

  while IFS= read -r path; do
    [ -n "$path" ] || continue

    # All three stages must exist, otherwise this is not a content conflict.
    if ! git show ":1:$path" > /dev/null 2>&1 ||
       ! git show ":2:$path" > /dev/null 2>&1 ||
       ! git show ":3:$path" > /dev/null 2>&1; then
      continue
    fi

    if ! git show ":1:$path" | has_chinese; then
      continue
    fi
    if git show ":2:$path" | has_chinese; then
      continue
    fi
    if git show ":3:$path" | has_chinese; then
      continue
    fi

    echo "Taking upstream translation of: $path"
    git checkout --theirs -- "$path"
    git add -- "$path"
  done <<< "$paths"
}

# Mirror image of take_upstream_translations: upstream reworded the Chinese
# text of a file that this fork had already translated.  Our side carries the
# same change in English, while the upstream side is still Chinese and would be
# rejected by scripts/enforce-no-chinese.sh right after the merge.  Keeping the
# local English wording is therefore the only resolution that can ever pass, so
# it is applied automatically instead of stalling the sync.
keep_local_translations() {
  local path paths
  paths="$(unmerged_paths)"

  while IFS= read -r path; do
    [ -n "$path" ] || continue

    if ! git show ":1:$path" > /dev/null 2>&1 ||
       ! git show ":2:$path" > /dev/null 2>&1 ||
       ! git show ":3:$path" > /dev/null 2>&1; then
      continue
    fi

    if ! git show ":1:$path" | has_chinese; then
      continue
    fi
    if git show ":2:$path" | has_chinese; then
      continue
    fi
    if ! git show ":3:$path" | has_chinese; then
      continue
    fi

    echo "Keeping local translation of: $path"
    merge_hunks_preferring_ours "$path"
  done <<< "$paths"
}

take_ours README.md
keep_policy_deletions
accept_upstream_removals
take_upstream_translations
keep_local_translations
merge_hunks_preferring_ours 1710.config
merge_hunks_preferring_ours 2010.config
