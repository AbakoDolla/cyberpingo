#!/usr/bin/env bash
# Petit outil de tri des échecs SSH pour la Mutuelle Alizé.
set -u

usage() {
  echo "usage: $0 JOURNAL" >&2
}

require_file() {
  local file_path="$1"
  [ -f "$file_path" ] || return 1
}

extract_failed_ips() {
  local file_path="$1"
  grep 'Failed password' "$file_path" | awk '{print $(NF-3)}'
}

journal="${1:-lnx-tp6-journal.log}"
if [ "$#" -gt 1 ]; then
  usage
  exit 64
fi
if ! require_file "$journal"; then
  usage
  exit 64
fi

total="$(grep -c 'Failed password' "$journal")"
echo "TOTAL_ECHECS=$total"

rang=0
while read -r count ip; do
  [ -n "$ip" ] || continue
  printf '%s %s\n' "$ip" "$count"
  rang=$((rang + 1))
  [ "$rang" -ge 3 ] && break
done < <(extract_failed_ips "$journal" | sort | uniq -c | sort -nr)
