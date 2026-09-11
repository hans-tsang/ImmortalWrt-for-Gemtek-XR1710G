#!/usr/bin/env bash

set -Eeuo pipefail

log_file="${1:-build.log}"

if [[ ! -f "$log_file" ]]; then
	echo "Build log not found: $log_file" >&2
	exit 1
fi

clean_log() {
	sed -E $'s/\x1B\\[[0-9;]*[[:alpha:]]//g; s/\r$//' "$log_file"
}

error_re='(^|[[:space:]])(ERROR:|FAILED:|Error [0-9]+|\xE9\x94\x99\xE8\xAF\xAF [0-9]+|fatal error:|undefined reference|No rule to make target|failed to build|recipe for target|go: .*requires go)|make\[[0-9]+\]: \*\*\*'

first_error_line="$(
	clean_log |
		perl -ne 'if (!$found && /'"$error_re"'/) { print $.; $found = 1 }'
)"

echo "=== Build error summary ==="

if [[ -z "$first_error_line" ]]; then
	echo "No common error markers found in $log_file"
	echo "Last 80 log lines:"
	clean_log | tail -80
	exit 0
fi

echo "First matching error context around line $first_error_line:"
	start=$(( first_error_line > 25 ? first_error_line - 25 : 1 ))
	end=$(( first_error_line + 45 ))
	clean_log | sed -n "${start},${end}p"

echo
echo "Last matching error lines:"
clean_log |
	perl -ne 'print $. . ":" . $_ if /'"$error_re"'/' |
	tail -20
