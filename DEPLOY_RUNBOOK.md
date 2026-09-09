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

Output: `deploy-bundle/` (`app.js` + production-only node_modules + `.next` +
prisma schema/migration + scripts) and `ni3ma-deploy-YYYYMMDD-HHMM.tar.gz` for
convenient single-file transfer.

## 3. Local → server (rsync)

```bash
./scripts/deploy-rsync.sh user@your-server.com:~/ni3ma/
```

It runs the dry run, asks for confirmation, then syncs for real — always with
the exclude list. Set `DEPLOY_YES=1` to skip the prompt.

**Do not run a bare `rsync --delete` by hand.** The bundle is a mirror of the
app root, so `--delete` removes every server-only file that is not in it. Two
of those take the site down:

| File | Why it matters |
| --- | --- |
| `.htaccess` | Holds the CloudLinux/Passenger stanza. Without it Apache never hands the request to the Node app and serves `~/ni3ma` as a static directory instead — there is no `index.html`, so visitors get a bare directory index. |
| `.env` | The real secrets. The bundle only carries `.env.example`. |

`scripts/deploy-rsync.sh` also excludes `tmp/`, `backups/`, `logs/`,
`restart.txt`, `public/uploads/` and `.well-known/`.

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
1. **Boot preflight** — aborts unless `app.js`, `.next/BUILD_ID`,
   `node_modules/next` and `.env` are all present, and warns when `.htaccess`
   is absent. This is the guard against a half-synced tree that leaves Apache
   serving a directory index.
2. Snapshots `.next` and `.env` to `backups/`.
3. Applies `prisma/migrate-governance.sql` to the platform DB (additive DDL).
4. Iterates every ACTIVE tenant from the `tenants` registry and applies the
   same migration (via `@prisma/client`; a tenant failure is reported but does
   not abort the restart).
5. Regenerates the Prisma client.
6. Touches `tmp/restart.txt` to trigger a Passenger restart.
7. Smoke-checks the homepage and fails if it gets a directory index back.

## 5. Verify

```bash
# On the server
tail -f ~/logs/passenger.log     # or wherever Passenger logs
curl -I https://your-domain.com
```

Set `SMOKE_URL` (or `AUTH_URL`) in `.env` to the public site URL and
`deploy-remote.sh` does this check itself at the end of every deploy — it
fails the deploy if the server answers with a directory index instead of the
app.

Browse `/bureau/employees`, `/bureau/library`, `/bureau/partnerships`,
`/bureau/paperwork/certificate?member=<id>` to confirm the new features
load. The sidebar should now show **16 bureau entries** (up from 9).

## Troubleshooting

### The site shows a directory index / "Index of /" instead of the app

Apache is serving the application directory as static files. That only happens
when Passenger is not handling the request, so the fix is always to get
Passenger booting again — adding an `index.html` would only paper over it.

Check, in this order, on the server:

```bash
cd ~/ni3ma
ls -la app.js .htaccess .env node_modules/next/package.json .next/BUILD_ID
```

| Missing | Fix |
| --- | --- |
| `app.js` | Rebuild the bundle (`scripts/deploy-local.sh` now includes it and refuses to ship without it) and re-sync. |
| `node_modules/` | Same — the bundle carries a production-pruned `node_modules`. |
| `.env` | Restore from `backups/.env.<timestamp>`, or copy `.env.example` and refill. |
| `.htaccess` | Regenerate it: cPanel › **Setup Node.js App** › your app › **Save**/**Restart**. |

Then restart and re-check:

```bash
mkdir -p tmp && touch tmp/restart.txt
tail -50 ~/logs/passenger.log
curl -sI https://your-domain.com/ | head -1
```

In cPanel › Setup Node.js App the three fields must be:

- **Application root:** `ni3ma` (the directory you rsync into)
- **Application URL:** the domain/subdomain being served
- **Application startup file:** `app.js`

For reference, the stanza cPanel writes into `~/ni3ma/.htaccess` looks like
this — the `PassengerNodejs` path is account-specific, so let cPanel generate
it rather than pasting it by hand:

```apache
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/<cpanel-user>/ni3ma"
PassengerBaseURI "/"
PassengerNodejs "/home/<cpanel-user>/nodevenv/ni3ma/20/bin/node"
PassengerAppType node
PassengerStartupFile app.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
```

### A deploy ran but the site still serves the old build

Passenger watches `tmp/restart.txt`, not `restart.txt` in the app root. Use:

```bash
mkdir -p tmp && touch tmp/restart.txt
```

`deploy-remote.sh` does this for you.

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
