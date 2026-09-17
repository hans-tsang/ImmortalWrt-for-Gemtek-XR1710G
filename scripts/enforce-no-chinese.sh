#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${1:-.}"
cd "$ROOT_DIR"

remove_zh_locale_dirs() {
  for base in package feeds; do
    [ -d "$base" ] || continue
    find "$base" -type d \( \
      -name 'zh-cn' -o -name 'zh_Hans' -o -name 'zh_CN' -o \
      -name 'zh-tw' -o -name 'zh_Hant' -o -name 'zh_TW' \
    \) -prune -exec rm -rf {} +
  done

  rm -rf package/emortal/luci-i18n-clientstatus-zh-cn
}

disable_chinese_packages() {
  local cfg
  for cfg in 1710.config 2010.config .config; do
    [ -f "$cfg" ] || continue
    perl -i -pe '
      s/^CONFIG_PACKAGE_default-settings-chn=y$/# CONFIG_PACKAGE_default-settings-chn is not set/g;
      s/^CONFIG_PACKAGE_luci-app-timewol=y$/# CONFIG_PACKAGE_luci-app-timewol is not set/g;
      s/^CONFIG_PACKAGE_(luci-i18n-[A-Za-z0-9_.+-]*-(?:zh-cn|zh-tw)|luci-i18n-[A-Za-z0-9_.+-]*-(?:zh_Hans|zh_Hant)|luci-i18n-[A-Za-z0-9_.+-]*-(?:zh_CN|zh_TW))=y$/# CONFIG_PACKAGE_$1 is not set/g;
    ' "$cfg"
  done
}

enforce_english_readme() {
  if [ -f README.en.md ]; then
    cp README.en.md README.md
  fi
}

# Scan tracked text files for CJK ideographs and CJK/full-width punctuation.
# Author names inside upstream
# kernel patches are attribution metadata and must not be rewritten, so the
# patch directories are excluded from the scan.  Imported vendor driver sources
# (package/kernel/airoha-pon/src) carry non-UTF-8 comments from the SoC vendor
# and are never shown in the UI, so they are skipped as well.
scan_for_chinese_characters() {
  local matches status

  command -v git >/dev/null 2>&1 || return 0
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0

  # The pattern only compiles in a UTF-8 locale; without it PCRE rejects the
  # code points and the scan would silently report a clean tree.
  set +e
  matches="$(LC_ALL=C.UTF-8 git grep -I -n -P '[\x{3000}-\x{303f}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}\x{ff01}-\x{ff60}]' -- \
    ':!target/linux/*/patches-*' ':!*/patches/*' ':!feeds' \
    ':!package/kernel/airoha-pon/src')"
  status=$?
  set -e

  # git grep exits 1 when nothing matched; anything above that is a real error.
  if [ "$status" -gt 1 ]; then
    echo "Failed to scan for Chinese characters (git grep exit $status)." >&2
    return 1
  fi

  if [ -n "$matches" ]; then
    echo "Chinese characters found in tracked files:" >&2
    echo "$matches" >&2
    return 1
  fi
}

remove_zh_locale_dirs
disable_chinese_packages
enforce_english_readme
scan_for_chinese_characters
