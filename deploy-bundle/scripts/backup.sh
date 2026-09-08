#!/usr/bin/env bash
# Nightly backup of the platform DB + every tenant DB.
# Install in cron:  0 3 * * * /home/<user>/ni3ma/scripts/backup.sh >> ~/backup.log 2>&1
#
# Requires: pg_dump on PATH (or set PG_DUMP), BACKUP_DIR, DATABASE_URL in env
# (.env is read automatically if present).

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && . ./.env && set +a

PG_DUMP="${PG_DUMP:-pg_dump}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/ni3ma}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"

dump_url() {
  local url="$1" label="$2"
  local out="$BACKUP_DIR/${label}_${STAMP}.sql.gz"
  if "$PG_DUMP" --no-owner --no-privileges "$url" | gzip > "$out"; then
    echo "OK  $label → $out"
  else
    echo "FAIL $label" >&2
    rm -f "$out"
  fi
}

# Platform DB (tenants registry + default data)
dump_url "$DATABASE_URL" "platform"

# Every ACTIVE tenant DB from the registry
psql "$DATABASE_URL" -tAc "SELECT slug || '|' || db_url FROM tenants WHERE status = 'ACTIVE'" \
| while IFS='|' read -r slug url; do
  [ -n "$slug" ] && dump_url "$url" "tenant_$slug"
done

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "Done."
