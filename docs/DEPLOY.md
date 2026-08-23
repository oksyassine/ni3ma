# Deployment & Operations

## Architecture (DB-per-tenant)

```
                    ┌──────────────────────────────┐
 apex domain ──────► │  Next.js app (this codebase) │
 {slug}.root ──────► │                              │
 custom domains      │  proxy.ts: auth + routing    │
                    └──────────┬───────────────────┘
                               │ host → dbUrl (lib/tenants.ts, cached)
              ┌────────────────┼─────────────────────┐
              ▼                ▼                     ▼
       platform DB       tenant DB 1           tenant DB N
   (tenants registry)   (association A)       (association B)
```

- The **platform DB** (`DATABASE_URL`) holds the `tenants` registry and also
  serves as fallback for hostless contexts (cron, build). Legacy Ni3ma data
  lives here until Ni3ma itself is migrated to its own tenant DB.
- Each association gets an **isolated Postgres database**. `src/lib/prisma.ts`
  resolves the tenant per-request via the Host header — no route changes needed.
- Tenant resolution cache: positive 30s, negative 5s. New tenants routable
  within ~5s of activation.

## DNS / hosting setup

1. Wildcard A/CNAME record: `*.ROOT_DOMAIN` → server IP.
2. Webserver (Apache/Nginx) must forward the `Host` header to Passenger.
3. Set in `.env`:
   - `ROOT_DOMAIN`, `NEXT_PUBLIC_ROOT_DOMAIN`
   - `TENANT_DB_URL_TEMPLATE` (e.g. `postgresql://user:pass@localhost:5432/ni3ma_t_{slug}`)
   - Rotate `AUTH_SECRET`/`NEXTAUTH_SECRET` (`openssl rand -base64 32`).

## Provisioning a tenant

Self-serve signup (`/start`) tries inline provisioning. If the DB user lacks
CREATEDB (common on cPanel), finish manually:

```bash
# create the DB in cPanel, grant your user, then:
npx tsx scripts/provision-tenant.ts <slug>
```

The script is idempotent: creates schema (prisma db push), seeds admin +
association info, flips registry status to ACTIVE.

Reset an admin password: `npx tsx scripts/provision-tenant.ts <slug> --reset-admin NEWPASS`

## Backups

Cron nightly:

```
0 3 * * * /path/to/ni3ma/scripts/backup.sh >> ~/backup.log 2>&1
```

Dumps platform + every ACTIVE tenant DB to `$BACKUP_DIR`, gzipped, 14-day retention.

## Compliance checklist (Morocco)

- CNDP declaration (law 09-08) before public launch — personal data of members/minors.
- Terms & privacy pages (TODO Phase 2).
- Per-tenant data export/delete = dump/restore of one isolated DB (trivial here).

## Known quirks

- **`scripts/patch-base-ui.js`** (runs automatically via postinstall) fixes an
  upstream bug in `@base-ui/utils/detectBrowser.js` that crashes SSR/prerender
  on Node >= 21 ("Cannot read properties of undefined (reading 'includes')").
  If you see that error after a fresh install, run `node scripts/patch-base-ui.js`.

## Known debt / next steps

See `docs/PLAN.md`. Priority order: plan enforcement middleware, YouCan Pay,
French i18n, WhatsApp notifications, migrate Ni3ma into its own tenant DB.
