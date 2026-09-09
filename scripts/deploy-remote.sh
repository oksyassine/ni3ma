#!/usr/bin/env bash
# Server-side deploy: verify the app can boot, apply migration, restart Passenger.
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

# 0a. Boot preflight — everything Passenger needs to serve a single request.
# When any of these is missing Apache stops proxying to the Node app and
# serves the app directory statically instead; with no index.html in it the
# site answers with a bare directory index. Catch it here, not from a browser.
echo "→ Boot preflight"
FATAL=0
for required in app.js package.json .next/BUILD_ID node_modules/next/package.json; do
  if [ ! -e "$required" ]; then
    echo "  ✗ MISSING $required" >&2
    FATAL=1
  else
    echo "  ✓ $required"
  fi
done
if [ ! -f .env ]; then
  echo "  ✗ MISSING .env — copy .env.example and fill in DATABASE_URL / AUTH_SECRET" >&2
  FATAL=1
else
  echo "  ✓ .env"
fi
if [ "$FATAL" -ne 0 ]; then
  echo "" >&2
  echo "Refusing to deploy: the app cannot boot in this state." >&2
  echo "A --delete rsync from an incomplete bundle is the usual cause." >&2
  echo "Rebuild with scripts/deploy-local.sh and ship with scripts/deploy-rsync.sh." >&2
  exit 1
fi
if [ ! -f .htaccess ]; then
  echo "  ! .htaccess absent from $APP_DIR" >&2
  echo "    If this directory is the domain document root, Apache is serving it" >&2
  echo "    statically right now (visitors see a directory index). Re-add the" >&2
  echo "    Passenger stanza from cPanel > Setup Node.js App (Restart/Save" >&2
  echo "    regenerates it), or see the Troubleshooting section of" >&2
  echo "    DEPLOY_RUNBOOK.md for the exact block." >&2
else
  echo "  ✓ .htaccess"
fi

# 0b. Backup current state (cheap insurance before touching the DB)
echo ""
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

# 2. Apply to each ACTIVE tenant DB.
# Uses @prisma/client for the per-tenant connections — the raw `pg` driver is
# not a dependency of this project, and requiring it aborted the deploy here,
# before the Passenger restart in step 4 ever ran.
echo ""
echo "→ Applying migration to every ACTIVE tenant DB"
node -e '
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const sql = fs.readFileSync("prisma/migrate-governance.sql", "utf8");
const statements = sql
  .split(";")
  .map((s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim())
  .filter(Boolean);
const p = new PrismaClient();
(async () => {
  const tenants = await p.tenant.findMany({ where: { status: "ACTIVE" }, select: { slug: true, dbUrl: true } });
  console.log(`  ${tenants.length} ACTIVE tenant(s)`);
  let failed = 0;
  for (const t of tenants) {
    const dbName = new URL(t.dbUrl).pathname.slice(1);
    const c = new PrismaClient({ datasourceUrl: t.dbUrl });
    try {
      for (const stmt of statements) {
        await c.$executeRawUnsafe(stmt);
      }
      console.log(`  ok ${t.slug} (${dbName})`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${t.slug}: ${e.message}`);
    } finally {
      await c.$disconnect();
    }
  }
  await p.$disconnect();
  if (failed > 0) {
    console.error(`  ${failed} tenant migration(s) failed — see above`);
  }
})().catch((e) => {
  console.error(`  tenant migration step failed: ${e.message}`);
  process.exitCode = 1;
});
' || echo "  ! tenant migration step reported errors — continuing to restart so the app is not left down"

# 3. Regenerate the Prisma client on the server (in case schema.prisma changed)
echo ""
echo "→ Prisma generate"
npx prisma generate

# 4. Restart Passenger (cPanel/o2switch).
# Passenger watches tmp/restart.txt in the app root — a restart.txt at the
# root alone is never read, so the old build kept serving after a deploy.
echo ""
echo "→ Restarting Passenger"
mkdir -p tmp
touch tmp/restart.txt
touch restart.txt   # harmless, and some panels still watch this one

# 5. Smoke check
echo ""
echo "→ Smoke check"
sleep 5
SMOKE_URL="${SMOKE_URL:-${AUTH_URL:-}}"
SMOKE_URL="${SMOKE_URL%/}"
SMOKE_BODY="/tmp/ni3ma-smoke.$$"
if [ -z "$SMOKE_URL" ]; then
  echo "  ! set SMOKE_URL (or AUTH_URL) in .env to the public site URL to enable this check"
elif ! command -v curl >/dev/null; then
  echo "  ! curl not available — skipping"
else
  STATUS="$(curl -sS -L --max-time 20 -o "$SMOKE_BODY" -w "%{http_code}" "$SMOKE_URL/" || true)"
  STATUS="${STATUS:-000}"
  echo "  GET $SMOKE_URL/ → HTTP $STATUS"
  if grep -qi "<title>Index of\|Directory listing for" "$SMOKE_BODY" 2>/dev/null; then
    echo "  ✗ The server returned a DIRECTORY INDEX, not the app." >&2
    echo "    Apache is serving this directory statically — Passenger is not" >&2
    echo "    handling the request. Check .htaccess and cPanel > Setup Node.js App" >&2
    echo "    (Application root, Application URL, Application startup file = app.js)." >&2
    rm -f "$SMOKE_BODY"
    exit 1
  fi
  rm -f "$SMOKE_BODY"
  case "$STATUS" in
    2*|3*) echo "  ✓ app is responding" ;;
    *)
      echo "  ✗ unexpected status — the app is not serving. Check:" >&2
      echo "      tail -50 ~/logs/passenger.log" >&2
      exit 1
      ;;
  esac
fi

echo ""
echo "✓ Deploy complete"
echo "  Build: $(cat .next/BUILD_ID)"
echo "  Time:  $(date)"
echo "  Logs:  tail -f ~/logs/passenger.log  (o2switch default)"
