#!/usr/bin/env bash
# Server-side deploy: apply migration, swap build, restart Passenger.
# Run from the application root on the server AFTER rsyncing the bundle.
#
# Set REMOTE_APP_DIR if your app lives outside ~/ni3ma.

set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIR="${REMOTE_APP_DIR:-$PWD}"
cd "$APP_DIR"

# Load .env
[ -f .env ] && set -a && . ./.env && set +a

# Sanity
command -v node >/dev/null || { echo "node not found"; exit 1; }
[ -d .next ] || { echo ".next missing — rsync the bundle first"; exit 1; }
[ -f prisma/migrate-governance.sql ] || { echo "migration missing"; exit 1; }

# 0. Backup current state (cheap insurance before touching the DB)
echo "→ Snapshot of current state"
cp -p .next/BUILD_ID .next/BUILD_ID.bak 2>/dev/null || true
mkdir -p backups
TS="$(date +%Y%m%d-%H%M%S)"
[ -f .env ] && cp .env "backups/.env.$TS"
[ -d .next ] && tar -czf "backups/.next-$TS.tgz" .next/ 2>/dev/null || true
echo "  backups/.env.$TS, backups/.next-$TS.tgz"

# 1. Apply additive migration to the platform DB
echo ""
echo "→ Applying governance migration to platform DB"
# Migrate-governance.sql is additive (CREATE TABLE/INDEX) by policy.
# If your prod schema has drifted, this is the place to do an
# `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` only — never destructive DDL.
npx prisma db execute --file prisma/migrate-governance.sql --schema prisma/schema.prisma

# 2. Apply to each ACTIVE tenant DB
echo ""
echo "→ Applying migration to every ACTIVE tenant DB"
node -e '
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const sql = fs.readFileSync("prisma/migrate-governance.sql", "utf8");
const p = new PrismaClient();
(async () => {
  const tenants = await p.tenant.findMany({ where: { status: "ACTIVE" }, select: { slug: true, dbUrl: true } });
  console.log(`  ${tenants.length} ACTIVE tenant(s)`);
  for (const t of tenants) {
    const dbName = new URL(t.dbUrl).pathname.slice(1);
    const c = new Client({ connectionString: t.dbUrl });
    await c.connect();
    try {
      for (const stmt of sql.split(";").map(s => s.split("\n").filter(l => !l.trim().startsWith("--")).join("\n").trim()).filter(Boolean)) {
        await c.query(stmt);
      }
      console.log(`  ✓ ${t.slug} (${dbName})`);
    } catch (e) {
      console.error(`  ✗ ${t.slug}: ${e.message}`);
    } finally {
      await c.end();
    }
  }
  await p.$disconnect();
})();
'

# 3. Regenerate the Prisma client on the server (in case schema.prisma changed)
echo ""
echo "→ Prisma generate"
npx prisma generate

# 4. Restart Passenger (cPanel/o2switch). Touch restart.txt in the app root.
echo ""
echo "→ Restarting Passenger"
touch restart.txt

# 5. Smoke check
echo ""
echo "→ Smoke check"
sleep 3
if command -v curl >/dev/null; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH_URL:-http://localhost:3000}/" || echo "000")
  echo "  GET / → HTTP $STATUS"
fi

echo ""
echo "✓ Deploy complete"
echo "  Build: $(cat .next/BUILD_ID)"
echo "  Time:  $(date)"
echo "  Logs:  tail -f ~/logs/passenger.log  (o2switch default)"
