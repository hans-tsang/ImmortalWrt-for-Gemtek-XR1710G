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
  for cfg in config.seed .config; do
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

remove_zh_locale_dirs
disable_chinese_packages
enforce_english_readme
