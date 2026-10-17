#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^bash[[:space:]]/usr/local/sbin/chinalowcost-release[[:space:]]([0-9a-f]{40})$ ]]; then
  exec bash /usr/local/sbin/chinalowcost-release "${BASH_REMATCH[1]}"
fi
printf 'Only a validated ChinaLowCost release command is allowed.\n' >&2
exit 1