# Ni3ma Platform — Session Context

## Project
Multi-tenant SaaS for Moroccan associations (Quran schools, charity, social,
parents' associations, federations, etc.). Stack: Next.js 16, React 19,
Prisma 5, NextAuth v5 (beta), shadcn/Base UI, Tailwind 4, Recharts.

Multi-tenant via DB-per-tenant. `src/lib/tenants.ts` resolves the right
client from the Host header. The platform DB hosts the `tenants` registry
+ billing.

o2switch shared-hosting deploy: build locally → rsync `.next` + `prisma` →
apply `prisma/migrate-governance.sql` server-side → `touch restart.txt`.

## Key files
- `prisma/schema.prisma` — 66 models, 26 governance tables added this branch
- `prisma/tenant-template.sql` — regenerated via `prisma migrate diff --from-empty`
- `prisma/migrate-governance.sql` — additive-only diff (HEAD → current),
  **always regenerated** to keep this in sync with `schema.prisma`
- `src/lib/rbac.ts` — `canViewGovernance` / `canManageGovernance`
- `src/lib/receipts.ts` — `ensureDonationReceipt` / `ensureContributionReceipt`
  / `ensureBeneficiaryReceipt` (idempotent race-safe auto-numbering)
- `src/lib/revalidate.ts` — `revalidateBureau(section)` + `revalidateFinancial()`
- `src/components/layout/app-sidebar.tsx` — bureau group has 17 children
- `src/app/(dashboard)/bureau/{meetings,grants,assets,sponsorships,documents,mandates,distributions,mail,branches,trainings,volunteer-contracts,employees,partnerships,library,campaigns,bene-receipts,inv-register,reminders}/`
- `src/app/(dashboard)/bureau/paperwork/{certificate,convocation,attendance-sheet,donation-receipt,contribution-receipt,beneficiary-receipt}/page.tsx`
- `src/app/(dashboard)/bureau/{inv-register,volunteer-contracts}/[id]/print/page.tsx`
- `src/app/(dashboard)/bureau/annual-report/page.tsx` — year select + print

## Conventions
- **Server pages**: read `auth()`, check `canViewGovernance`, fetch via the
  `prisma` facade, serialize `Decimal → Number` and `Date → ISO string slice`
  before passing to client components.
- **Client components**: `"use client"`, use `useT()` from
  `@/components/i18n/provider` for i18n; format dates with
  `toLocaleDateString(locale === "fr" ? "fr-MA" : "ar-MA")`.
- **API routes**: `auth()` + role check + zod validate + `recordAudit` +
  `revalidateBureau` (or `revalidateFinancial`) on every successful POST/PATCH/DELETE.
- **Print pages** live under `bureau/paperwork/*` and `bureau/inv-register/[id]/print`
  + `bureau/volunteer-contracts/[id]/print`. All use `DocSheet` + `PrintButton`
  from `bureau/paperwork/doc-shell.tsx`. The print shell uses `<style>` with
  `@media print{aside[data-slot="sidebar"],header{display:none !important}}`
  to hide the app shell. **Always thread `locale` from `getT()` to print
  pages** — never hardcode `ar-MA` (FR users get FR documents).
- **i18n keys** in `src/lib/i18n/dict/governance.ts` are namespaced
  `gov.<module>.<key>`. AR + FR in the same file, single `as const` block.
  When adding a new AR/FR key, use `bash` to check the difference between
  `t("gov.*")` actually used in code vs keys defined.

## What I built in this branch
**Round 1 (small fixes):** `t("common.delete")`→`t("gov.common.delete")` in
14 files. BUREAU_RW role fix. `prisma/tenant-template.sql` regenerated.

**Round 2 (governance & compliance, 9 modules):**
- Meetings + Decisions (الجمع العام والمحاضر) with quorum/votes/body
- Grants + Tranches (الاتفاقيات والدعم) with tranche tracking, overage alerts
- Asset Inventory (جرد الممتلكات) with per-book total
- Sponsorships (الكفالات) with monthly expected amount
- Documents (سجل الوثائق الرسمية) with expiry alerts
- Mandates (المكتب والانتدابات) with art. 5 declaration alerts
- Distributions (حملات التوزيع الموسمية) for Ramadan/iftar
- Mail Registry (سجل المراسلات) with auto-serial + overdue alerts
- Branches (الفروع) + Trainings (الدورات التكوينية) + Volunteer Contracts (law 06.18)
- Annual Report (printable, year selector, with `locale` from `getT`)

**Round 3 (paperwork + cross-cutting):** same set + Mail + Branches +
Trainings + Volunteer Contracts + paperwork hub (cert, convocation,
attendance sheet, volunteer contract print, donation/contribution receipts).

**Round 4 (audit fixes + receipts):** all 50 audit findings triaged.
Implemented: 14 fix bugs, 2 auto-numbered receipt models (Donation +
WeeklyContribution extended in place), Paperwork generator with 5
printable types, race-safe mail serial number, Payroll P2002 409, locale
in print pages, i18n hardcoded text extracted, revalidateBureau added to
all 32 bureau API routes.

**Round 5 (this final round — 3 new features + fixes):**
- **DonationCampaign** model: fundraiser campaigns with target amount,
  isPublic flag, public slug → renders on `/p/[slug]` (existing public page,
  campaign lookup not yet wired — that's the obvious next step)
- **BeneficiaryReceipt** model: counter-signed receipt for in-kind/service
  delivery to a social case. Auto-numbered `B/2026/000001` series
  (symmetric to donor receipts).
- **InventoryRegister** model: annual inventory snapshot required for any
  association receiving >10k MAD public funds (art. 32 ter Dahir 1958).
  Frozen `totalValue` from `Asset` rows. Printable with grouped-by-category
  layout.
- **Reminders** view: lists members with no contributions or stale (>30d)
  contributions, with pre-filled WhatsApp message + click-to-send link.
- **Donation form** extended with `donorCin`/`donorAddress`/`donorEmail`/
  `campaignId` (previously had only donorName + phone). Receipt number now
  shown in the list.
- **Meetings editor**: discard-edits button + safer `toISOString()` normalization
- **Sidebar**: 4 new entries (campaigns, bene-receipts, inv-register, reminders)
- `revalidateFinancial()` now also busts `/bureau/reminders`

## What I deliberately did NOT do
- Public `/p/[slug]` page doesn't yet read the new DonationCampaign — that's
  the obvious follow-up (one query + a progress widget on the public page).
- WhatsApp outbound is only the message preview + click-to-send link. A real
  provider integration (EnvoiSMS / Wakil / Twilio) is a separate module.
- PCAF book-journal (livre-journal, grand-livre) — research #3 from the
  audit. Big effort. The inventory register + annual report + receipts
  cover the most-pressing compliance needs.
- Volunteer shift planning — research #4. Skipped.
- Pagination on the rest of the high-volume list endpoints (only mail was
  capped at 500). Other modules still unbounded.
- Donation receipt page at `/bureau/paperwork/donation-receipt` uses my new
  receipt pipeline. The older page at `/financial/donations/[id]/receipt`
  still works (legacy). Did not migrate it.

## Migration policy (important for next deploy)
`prisma/migrate-governance.sql` is **regenerated fresh from `prisma migrate
diff --from-schema-datamodel HEAD:prisma/schema.prisma --to-schema-datamodel
prisma/schema.prisma`**. The script in `scripts/deploy-remote.sh` applies
this to:
1. the platform DB (the `tenants` registry lives here)
2. every ACTIVE tenant DB

It is **additive only** (CREATE TABLE/INDEX/TYPE + AddForeignKey). Never
breaks or modifies existing columns. If you need destructive changes, ship
a separate manual migration after taking a DB backup.

## Deploy
```bash
./scripts/deploy-local.sh    # build + bundle → deploy-bundle/
rsync -avz --delete deploy-bundle/ user@server:~/ni3ma/
ssh user@server 'cd ~/ni3ma && ./scripts/deploy-remote.sh'
```

The `deploy-remote.sh`:
1. Snapshots current state to `backups/`
2. Applies `prisma/migrate-governance.sql` to platform DB
3. Applies to every ACTIVE tenant (loops via `pg.Client`)
4. Regenerates Prisma client
5. Touches `restart.txt` for Passenger

## Lessons / gotchas for next session
1. **Prisma `Decimal` → `number`** must be done before passing to client
   components. Same for `Date → string`. Centralize this in the server page
   serialization (see the per-page `serializeX` pattern).
2. **Print pages and `Date.now()`**: react-hooks/purity forbids inline
   `Date.now()` in server components too. Move to a module-level helper.
3. **Unique constraints in this codebase**: the new `MailItem @@unique`
   is enforced server-side. The mail POST handler has a 5-attempt retry
   that handles concurrent races by recomputing the sequence.
4. **Receipts are idempotent**: `ensureDonationReceipt` checks if the
   receipt number is already set, only allocates on first call, and
   tolerates P2002 races.
5. **Multi-tenant correctness**: every print page MUST look up the
   association name from BOTH `prisma.associationInfo.findFirst()` AND
   the tenant record (`getTenantRecordForHost`). The two are independent
   and the wrong one will be used otherwise.
6. **The deploy bundle is huge (925 MB)**: it's `node_modules` + `.next`.
   Don't check it into git. Re-run `scripts/deploy-local.sh` before
   every deploy.
7. **Audit findings file**: I didn't keep a list of all 50 audit findings.
   The high/medium ones I addressed are above. Low/nitpick ones
   (aria-label on every icon button, dialog confirm replacement of
   `window.confirm`, etc.) are still pending.
8. **The bureau group in the sidebar has 17 children**. The dashboard
   sidebar is scrollable but it's getting crowded. A grouping/sub-nav
   would help UX. Not done.

## Next round candidates (priority order)
1. **DonationCampaign → public page wiring**: query the public donation
   page by `slug` + show progress + accept donations through it ✓ DONE
2. **InventoryRegister printable bilingualization**: the print page
   already uses `dir={locale === "fr" ? "ltr" : "rtl"}` but the
   condition/category text was hardcoded; check
3. **Volunteer shift planning** — research #4. Quick module.
4. **WhatsApp/SMS outbound integration** — env-gated provider ✓ DONE (Round 6)
5. **PCAF book-journal** — large but unlocks Pro tier
6. **CSRF middleware** — especially important for multi-tenant same eTLD
7. **Donation receipt migration** — update the legacy
   `/financial/donations/[id]/receipt` page to use the new receipt helper
8. **Pagination on remaining high-volume endpoints**

## Round 6 — what just shipped

### New features
- **`/bureau/messages`** — WhatsApp/SMS/Email outbound. `MessageTemplate`
  model with `{varName}` placeholders, `MessageOut` log (with cost per
  message). Two providers: `TestProvider` (default — records messages in
  DB for inspection) and `HttpProvider` (POST to a webhook when
  `MESSAGE_PROVIDER=http` is set). Template CRUD + send log + bulk-send
  dialog with multiselect over adult members.
- **Bulk WhatsApp from reminders** — `/bureau/reminders` now has a
  "sendReminders" button that opens a template picker + pre-filled preview
  + member multiselect + bulk POST to `/api/messages`.
- **`/bureau/audit`** — read-only audit log with entity/action filters,
  pagination, and per-entry expandable before/after JSON. The data was
  always there (`recordAudit` everywhere); this is the bureau's window
  into it. The existing `/admin/audit` is admin-only.
- **CSV export routes** — `/api/export/members` and `/api/export/donations`
  download AR/FR-friendly CSVs (UTF-8 BOM, RFC 4180 quoting). CSV buttons
  added to the donations list.
- **Public donation page wiring** — `/p/[slug]` now also matches a
  `DonationCampaign` by slug. If a campaign is found, it's rendered
  either standalone (when no project exists) or as a green progress
  banner above the project page.
- **Bureau dashboard enrichment** — `/bureau` now shows this-month
  donations/contributions KPIs, open grant tranches, active campaigns,
  and the 8 most-recent audit-log entries with a link to the full audit
  page. Header line shows the Hijri date under the Gregorian.

### Hijri dates (`src/lib/dates.ts`)
- `hijriDate(d, locale)` and `hijriYear(d)` use the built-in
  `Intl.DateTimeFormat` with `islamic-umalqura` calendar — works in
  Node 20+ and all modern browsers, no library.
- Applied to the bureau dashboard header and the reminders list
  (small sub-line under the Gregorian date in parens).

### Schema additions
- `MessageTemplate` (key `@unique`, name, channel, body, variables
  JSON-like, isActive)
- `MessageOut` (channel, recipientPhone/Email/Name/MemberId, body,
  templateKey FK, variables Json, provider/providerMessageId/cost,
  status QUEUED/SENT/DELIVERED/FAILED, error, sentAt)
- `Member.messagesOut` reverse relation
- 66 tables total; 26 in this branch's `migrate-governance.sql`.

### New routes
- `GET/POST /api/message-templates` + `PATCH/DELETE /api/message-templates/[key]`
- `GET/POST /api/messages` (GET = send log; POST = bulk-send with template
  rendering)
- `GET /api/audit-logs` (bureau-scoped, paginated 100/page, entity+action
  filters)
- `GET /api/export/members` + `GET /api/export/donations` (CSV)

### New env variables (optional)
- `MESSAGE_PROVIDER=http` — switch from test to HTTP provider
- `MESSAGE_PROVIDER_URL` — webhook URL (POST JSON `{to, body, channel}`)
- `MESSAGE_PROVIDER_TOKEN` — optional Bearer token
- `MESSAGE_PROVIDER_DEFAULT_CHANNEL` — default `WHATSAPP`

### Sidebar additions
- 💬 `Messages` (ADMIN/BUREAU/BUREAU_RW) — bulk WhatsApp center
- 🛡️ `Journal d'audit` — bureau audit log

### What I deliberately did NOT do (still pending)
- Real outbound provider integration code (EnvoiSMS, Wakil, Twilio).
  The HTTP provider is a generic webhook; bureau can drop in their
  provider's URL.
- Volunteer shift planning
- PCAF book-journal
- CSRF middleware
- Migration of legacy `/financial/donations/[id]/receipt` page to the
  new receipt helper
- Pagination on remaining list endpoints (only mail has a `take` cap)
- Real OAuth/OpenID for SSO (currently just username/password)

## Lessons from Round 6
1. **`lucide-react` exports collide** — `Heart`, `HandHeart`,
   `LayoutDashboard`, `Boxes` all already imported elsewhere in
   `app-sidebar.tsx`. Always use aliases when adding new icons.
2. **`react-hooks/purity`** fires for any `new Date()` in a server
   component. Move to module-level helpers (`daysSince` pattern).
3. **`Prisma.InputJsonValue` vs `null`**: Prisma rejects `null` in JSON
   fields. Use `Prisma.JsonNull` for explicit "no value" sentinel.
4. **TS narrowing with multiple early returns**: after several
   `if (!project && ...) return X` branches, TS can't narrow `project`
   through to the bottom of the function. Move the project.X aggregations
   AFTER the last `if (!project) return` so narrowing is monomorphic.
5. **JSX wrapper className hygiene**: when adding an extra wrapper div,
   count the opens/closes carefully — `</div>` indentation alone can
   lose one. Use a grep-counting check after every restructure.
6. **Server component vs client component split for messaging**: the
   `renderTemplate` function uses `prisma` indirectly (through the
   provider) so it can't be imported into client components. Mirror the
   template renderer in a tiny `lib/messaging-client.ts` that has zero
   Prisma deps.
7. **The `revalidateBureau` type is now 21 strings**. Every new
   top-level bureau view needs to add its key. Forgetting it means a
   mutation doesn't bust the related page.

## Next round candidates (priority order)
1. Real provider integration code (EnvoiSMS / Wakil / Twilio adapter)
2. Volunteer shift planning (research #4) — quick module
3. PCAF book-journal (livre-journal + grand-livre) — unlocks Pro tier
4. CSRF middleware — important for multi-tenant same eTLD
5. Member self-service portal (forgot password, profile) — needs
   `Member.email` field addition
6. Zakat tracking (8 asnaf categories) — extend `Donation.kind`
7. Events & ticketing module (galas, marches vertes)
8. Federation HQ view (read-only cross-tenant)
9. CashPlus top-up integration (Moroccan unbanked donation channel)
10. OCR for `OfficialDocument.fileUrl` + version control

## Useful commands
- `npx prisma validate` — check schema
- `npx prisma generate` — regen client
- Regenerate migrate-governance.sql:
  ```bash
  git show HEAD:prisma/schema.prisma > /tmp/opencode/schema-old.prisma
  npx prisma migrate diff --from-schema-datamodel /tmp/opencode/schema-old.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrate-governance.sql
  ```
- Same with `--from-empty` for the tenant template
- `npx tsc --noEmit` — typecheck
- `npx eslint src/app/(dashboard)/bureau src/app/api` — lint bureau
- `npm run build` — full production build
- `bash scripts/deploy-local.sh` — build + bundle

## Note on the audit agent
The two audit sub-agents that ran in the previous session found ~50 issues
in total. They were useful but some were false positives:
- `gov.positions.` empty key — was template-string `t(\`gov.positions.${m.position}\`)`,
  audit's literal grep matched the empty prefix
- The decision body was already implemented before the audit was done

The audit's biggest genuine wins: the CNSS math bug (4.48% vs 2.26%),
the locale issue in print pages, the MailItem P2002 race, and the receipt
fields being non-inputtable on the donation form.
