# Deploy Runbook — o2switch (Passenger)

End-to-end deploy for the four governance & compliance feature rounds:
1. Build & bundle locally.
2. Apply schema migration on the server (platform DB + every ACTIVE tenant DB).
3. Restart Passenger.

## Prerequisites

- Local: Node 20.x, npm, `npx prisma`, rsync, ssh.
- Server: o2switch cPanel account, SSH access, `.env` file with `DATABASE_URL`
  pointing to the platform DB and `TENANT_DB_URL_TEMPLATE` configured.
- The `users` table on server must have CREATEDB privilege (or run migrations
  via cPanel instead — see `docs/DEPLOY.md`).

## 1. Local — verify & build

```bash
npm install
npx prisma generate
npm run lint          # eslint
npx tsc --noEmit      # type check
npm run build         # next build
```

## 2. Local — bundle

```bash
./scripts/deploy-local.sh
```

Output: `deploy-bundle/` (production-only node_modules + `.next` + prisma
schema/migration + scripts) and `ni3ma-deploy-YYYYMMDD-HHMM.tar.gz` for
convenient single-file transfer.

## 3. Local → server (rsync)

```bash
# Dry run first
rsync -avn --delete deploy-bundle/ user@your-server.com:~/ni3ma/

# Then real
rsync -avz --delete deploy-bundle/ user@your-server.com:~/ni3ma/
```

## 4. Server — finalize

```bash
ssh user@your-server.com
cd ~/ni3ma

# Make sure your .env is up to date with new env vars (none required for
# the 4 new feature rounds, but verify AUTH_SECRET / DATABASE_URL are set).
[ -f .env ] || cp .env.example .env  # then edit

# Apply migration + restart in one command
./scripts/deploy-remote.sh
```

The remote script:
1. Snapshots `.next` and `.env` to `backups/`.
2. Applies `prisma/migrate-governance.sql` to the platform DB (additive DDL).
3. Iterates every ACTIVE tenant from the `tenants` registry and applies the
   same migration.
4. Regenerates the Prisma client.
5. Touches `restart.txt` to trigger a Passenger restart.
6. Smoke-checks the homepage.

## 5. Verify

```bash
# On the server
tail -f ~/logs/passenger.log     # or wherever Passenger logs
curl -I https://your-domain.com
```

Browse `/bureau/employees`, `/bureau/library`, `/bureau/partnerships`,
`/bureau/paperwork/certificate?member=<id>` to confirm the new features
load. The sidebar should now show **16 bureau entries** (up from 9).

## Migration policy (important)

`prisma/migrate-governance.sql` is regenerated from
`prisma diff --from-schema-datamodel HEAD:prisma/schema.prisma --to prisma/schema.prisma`
and contains **only additive DDL** (`CREATE TABLE`, `CREATE INDEX`,
`CREATE TYPE`, `AddForeignKey`). It will NOT touch existing columns or drop
anything. This matches the o2switch deploy policy documented in commit
`7f9132d` (additive-DDL migration due to prod schema drift).

If you need to make breaking changes (rename, drop, change type), ship them
as a separate **manual** migration after taking a DB backup.

## What was deployed (4 rounds)

### Round 1 — base platform fixes
- `billing/page.tsx`: fixed escaped template literals in plan label keys
- `app-sidebar.tsx`: BUREAU_RW role fix on bureau group, removed unused imports
- `db/tenant-template.sql`: regenerated (41 tables, splitter-safe for retry-provision)

### Round 2 — governance pack (4 modules)
- **Meetings + Decisions** (الجمع العام والمحاضر) — `/bureau/meetings`
- **Grants + Tranches** (الاتفاقيات والدعم) — `/bureau/grants`
- **Asset Inventory** (جرد الممتلكات) — `/bureau/assets`
- **Sponsorships** (الكفالات) — `/bureau/sponsorships`
- **Annual Report** (التقرير السنوي) — `/bureau/annual-report` (printable)

### Round 3 — paperwork + cross-cutting (4 modules)
- **Documents** (سجل الوثائق الرسمية) with expiry alerts — `/bureau/documents`
- **Mandates** (تشكيلة المكتب) with art. 5 declaration tracking — `/bureau/mandates`
- **Distributions** (حملات التوزيع) for Ramadan/iftar/adhi — `/bureau/distributions`
- **Mail Registry** (سجل المراسلات) with auto-serial + overdue alerts — `/bureau/mail`
- **Branches** (الفروع والفيدراليات) — `/bureau/branches`
- **Trainings** (الدورات التكوينية) — `/bureau/trainings`
- **Volunteer Contracts** (عقود التطوع — law 06.18) — `/bureau/volunteer-contracts`
- **Paperwork Generator** (مولد الوثائق) — `/bureau/paperwork`

### Round 4 — staff & resources (3 modules)
- **Employees & Payroll** (الموظفون والأجور + CNSS) — `/bureau/employees`
- **Partnerships** (الشراكات غير المالية) — `/bureau/partnerships`
- **Library & Borrowings** (المكتبة والإعارة) — `/bureau/library`

## Rollback

```bash
ssh user@server 'cd ~/ni3ma
  tar -xzf backups/.next-YYYYMMDD-HHMMSS.tgz -C .next
  # Schema rollback: see backups/ for the SQL snapshot. The migration
  # only adds tables, so leaving the new tables in place (unused) is
  # the safest rollback — no data is touched.
  touch restart.txt'
```

## New tables added in this deploy

```
meetings                  meeting_decisions
grants                    grant_tranches
assets
sponsorships
official_documents
bureau_mandates
distribution_campaigns    distribution_entries
mail_items
branches
training_courses          course_participants
volunteer_contracts
employees                 payroll_runs
partnerships
library_books             book_borrowings
```

20 new tables; `migrate-governance.sql` covers all of them.
