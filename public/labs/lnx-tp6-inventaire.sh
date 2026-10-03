#!/usr/bin/env bash
# Contrôle rapide des comptes qui méritent une revue.
set -u

usage() {
  echo "usage: $0 CSV [PREFIXE]" >&2
}

check_file() {
  local csv_path="$1"
  [ -f "$csv_path" ] || return 1
}

csv="${1:-lnx-tp6-comptes.csv}"
prefix="${2:-}"
if [ "$#" -gt 2 ]; then
  usage
  exit 64
fi
if ! check_file "$csv"; then
  usage
  exit 64
fi

awk -F';' -v prefix="$prefix" '
NR == 1 { next }
(prefix == "" || $1 ~ "^" prefix) {
  service_shell = ($2 == "service" && $4 != "/usr/sbin/nologin")
  password_old = ($5 + 0 > 90)
  if (service_shell || password_old) {
    print $1 ";" $2 ";" $4 ";" $5
    count += 1
  }
}
END { print "TOTAL=" count + 0 }' "$csv"
