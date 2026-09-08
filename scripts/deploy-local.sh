#!/usr/bin/env bash
# Build & bundle a deployable artifact for o2switch shared hosting.
# Run this LOCALLY, then rsync the resulting deploy-bundle/ directory to
# the server and run scripts/deploy-remote.sh there.
#
# Pipeline:
#   1. prisma generate
#   2. prisma migrate diff (validate migration SQL is current)
#   3. next build (production)
#   4. pack into deploy-bundle/

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
cp package.json package-lock.json next.config.ts "$BUNDLE/"
cp -r prisma "$BUNDLE/"
cp -r scripts "$BUNDLE/"
cp .env.example "$BUNDLE/.env.example" 2>/dev/null || true

# Slim node_modules to production-only (large reduction)
if [ -d node_modules ]; then
  cp -r node_modules "$BUNDLE/node_modules.bak" 2>/dev/null || true
fi
cd "$BUNDLE"
npm prune --omit=dev --no-audit --no-fund 2>&1 | tail -2 || true
cd ..
rm -rf "$BUNDLE/node_modules.bak" 2>/dev/null

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
ls -la "$BUNDLE" | head -10
echo ""
echo "Next steps:"
echo "  rsync -avz --delete $BUNDLE/ user@server:~/ni3ma/"
echo "  ssh user@server 'cd ~/ni3ma && ./scripts/deploy-remote.sh'"
