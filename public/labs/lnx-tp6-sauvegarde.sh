#!/usr/bin/env bash
# Construction d’une commande d’archivage à relire avant exécution.
set -u

usage() {
  echo "usage: $0 [LABEL]" >&2
}

build_command() {
  local current_label="$1"
  printf "printf 'archive=%%s\\n' %s" "$current_label"
}

label="${1:-rapport-avril}"
if [ "$#" -gt 1 ]; then
  usage
  exit 64
fi

commande="$(build_command "$label")"
echo "COMMANDE=$commande"

# La commande construite ci-dessus est ensuite exécutée telle quelle.
eval "$commande"
