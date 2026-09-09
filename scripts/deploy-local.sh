#!/usr/bin/env bash
# Build & bundle a deployable artifact for o2switch shared hosting.
# Run this LOCALLY, then ship the resulting deploy-bundle/ with
# scripts/deploy-rsync.sh and run scripts/deploy-remote.sh on the server.
#
# Pipeline:
#   1. prisma generate
#   2. validate migration SQL is present
#   3. next build (production)
#   4. pack into deploy-bundle/
#   5. verify the bundle contains everything Passenger needs to boot

set -euo pipefail
cd "$(dirname "$0")/.."

BUNDLE="deploy-bundle"
STAMP="$(date +%Y%m%d-%H%M%S)"

# 1. Prisma client
npx prisma generate

# 2. Validate migration files exist & are non-empty
for f in prisma/tenant-template.sql prisma/migrate-governance.sql; do
  if [ ! -s "$f" ]; then
    echo "ERROR: $f is missing or empty" >&2
    exit 1
  fi
  echo "  $f: $(wc -l < "$f") lines, $(grep -c 'CREATE TABLE' "$f") tables"
done

# 3. Build
npm run build

# 4. Pack
rm -rf "$BUNDLE"
mkdir -p "$BUNDLE"
cp -r .next "$BUNDLE/"
cp -r public "$BUNDLE/" 2>/dev/null || true
# app.js is the Passenger startup file named in the .htaccess stanza. It has
# to be in the bundle: the deploy rsyncs with --delete, so anything missing
# here is deleted from the server. With no app.js Passenger has nothing to
# boot and Apache falls back to serving ~/ni3ma as a plain directory — which
# is how the site ends up showing a directory index instead of the app.
cp app.js package.json package-lock.json next.config.ts "$BUNDLE/"
cp -r prisma "$BUNDLE/"
cp -r scripts "$BUNDLE/"
cp .env.example "$BUNDLE/.env.example" 2>/dev/null || true

# Slim node_modules to production-only (large reduction).
# Copy the tree into place FIRST, then prune it. Pruning a bundle that has no
# node_modules is a silent no-op, and shipping that bundle with --delete wipes
# node_modules off the server.
if [ ! -d node_modules ]; then
  echo "ERROR: node_modules/ missing — run 'npm install' first" >&2
  exit 1
fi
cp -r node_modules "$BUNDLE/node_modules"
( cd "$BUNDLE" && npm prune --omit=dev --no-audit --no-fund 2>&1 | tail -2 )

# 5. Verify the bundle can actually boot. Every path below is load-bearing at
# runtime; a bundle missing any of them takes the site down when it lands.
MISSING=0
for required in \
  app.js \
  package.json \
  next.config.ts \
  .next/BUILD_ID \
  node_modules/next/package.json \
  node_modules/react/package.json \
  node_modules/@prisma/client/package.json \
  node_modules/prisma/package.json \
  prisma/schema.prisma
do
  if [ ! -e "$BUNDLE/$required" ]; then
    echo "ERROR: bundle is missing $required" >&2
    MISSING=1
  fi
done
if [ "$MISSING" -ne 0 ]; then
  echo "" >&2
  echo "Refusing to ship an unbootable bundle. Fix the above and re-run." >&2
  exit 1
fi

# Write a manifest the user can glance at on the server
cat > "$BUNDLE/MANIFEST.txt" <<EOF
ni3ma deploy bundle
Built: $STAMP
Next.js build: $(date -d @$(stat -c %Y .next/BUILD_ID 2>/dev/null) -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || stat -c %y .next/BUILD_ID)
Migration tables: $(grep -c 'CREATE TABLE' prisma/migrate-governance.sql)
Tenant template tables: $(grep -c 'CREATE TABLE' prisma/tenant-template.sql)
EOF

# Tarball for rsync convenience
tar -czf "ni3ma-deploy-$STAMP.tar.gz" -C "$BUNDLE" . 2>&1 | tail -1 || true

echo ""
echo "✓ Bundle ready: $BUNDLE/"
echo "  app.js:       present (Passenger startup file)"
echo "  node_modules: $(find "$BUNDLE/node_modules" -maxdepth 1 -mindepth 1 -type d | wc -l) packages"
echo "  build:        $(cat "$BUNDLE/.next/BUILD_ID")"
echo ""
echo "Next steps:"
echo "  ./scripts/deploy-rsync.sh user@server:~/ni3ma/"
echo "  ssh user@server 'cd ~/ni3ma && ./scripts/deploy-remote.sh'"
echo ""
echo "Do NOT rsync by hand without the excludes in deploy-rsync.sh —"
echo "--delete will remove the server's .htaccess and .env and break the site."
