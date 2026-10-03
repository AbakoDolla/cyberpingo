#!/usr/bin/env bash
# Démonstration d’un nettoyage trop large dans un répertoire temporaire.
set -u

usage() {
  echo "usage: $0 [DOSSIER]" >&2
}

seed_fixture() {
  local target_dir="$1"
  local entry
  mkdir -p "$target_dir"
  for entry in "ancien-un.log|202603010101" "ancien deux.log|202603020101" "ancien-trois.txt|202603050101" "recent.txt|202604140101"; do
    local file_name="${entry%%|*}"
    local stamp="${entry##*|}"
    touch -t "$stamp" "$target_dir/$file_name"
  done
}

report_remaining() {
  local target_dir="$1"
  find "$target_dir" -maxdepth 1 -type f | wc -l | tr -d ' '
}

cleanup_dir="${1:-a supprimer}"
if [ "$#" -gt 1 ]; then
  usage
  exit 64
fi
workdir="$(mktemp -d "${TMPDIR:-/tmp}/alize-clean.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT
cd "$workdir" || exit 70
seed_fixture "$cleanup_dir"

old_count="$(find "$cleanup_dir" -maxdepth 1 -type f ! -newermt '2026-03-15 00:00:00 UTC' | wc -l | tr -d ' ')"
echo "ANCIENS=$old_count"
rm -f $cleanup_dir/*
remaining="$(report_remaining "$cleanup_dir")"
echo "RESTANTS=$remaining"
