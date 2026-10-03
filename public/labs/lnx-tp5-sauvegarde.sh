#!/usr/bin/env bash
set -u

SOURCE_DIR="/srv/partage adhérents"
MIRROR_DIR="/backup/local/partage"
RESTIC_REPO="/backup/local/restic-repo"
PASSWORD_FILE="/root/.config/restic/alize-passphrase"
LOG_FILE="/var/log/backup-alize.log"

echo "[$(date -u +%FT%TZ)] debut sauvegarde" >> "$LOG_FILE"
rsync -a --delete "$SOURCE_DIR/" "$MIRROR_DIR/"
if [ $? -ne 0 ]; then
  echo "[$(date -u +%FT%TZ)] miroir en erreur" >> "$LOG_FILE"
fi
restic -r "$RESTIC_REPO" --password-file "$PASSWORD_FILE" backup $SOURCE_DIR --tag nightly
restic -r "$RESTIC_REPO" --password-file "$PASSWORD_FILE" forget --keep-last 7 --prune
