# Ni3ma → Public SaaS: Review, Market Analysis & Roadmap

## 1. Current state assessment

### Strengths (keep — better than most MVPs)
- Solid domain modeling: members/family links, sections, financials, projects w/ plans-tasks-risks-stakeholders, social cases, Quran progress w/ tajweed rubric, volunteer hours, audit log, academic years.
- Real security hygiene: bcrypt + timing-equalized login, per-username rate limiting, granular SectionPermission/BureauPermission tables layered over roles, audit logging, RBAC proxy.
- Modern stack: Next.js 16, Prisma, Tailwind v4, shadcn-style UI, zod validations.
- Public project pages (`/p/[slug]`) — proto-marketing already exists.

### Gaps blocking public launch
| # | Gap | Severity |
|---|-----|----------|
| 1 | **Single-tenant hardcoded**: `AssociationInfo id=1`, no `associationId` anywhere | Blocker for SaaS |
| 2 | No landing/pricing page — root redirects to login | Blocker |
| 3 | No self-serve association signup/onboarding | Blocker |
| 4 | No billing (subscriptions/payments) | Blocker for revenue |
| 5 | Arabic-only UI — French needed for wide Moroccan association market | High |
| 6 | Weak/guessable `AUTH_SECRET` in `.env` (fine locally, must rotate for prod) | High |
| 7 | In-memory rate limiter — breaks under multiple workers/PM2 cluster | Medium |
| 8 | 18 ESLint errors | Medium |
| 9 | No automated tests, no CI | Medium |
| 10 | File uploads (photos/receipts) stored how? needs object storage strategy for multi-tenant | Medium |
| 11 | No backups/monitoring story documented | Medium |

## 2. Market & competitors (researched Aug 2026)

**Market:** ~220k registered Moroccan associations; education/culture/sport dominate. Kouttabs/dar al-quran run on paper+Excel+WhatsApp. Foreign funding declared by associations: 800M MAD (2024). Ministry training 3,900 imams in digital tools = tailwind.

**Competitor landscape:**
- **Global (Wild Apricot $66/mo, NeonCRM $99/mo, Springly €19–109/mo):** mature but no Arabic RTL, no Moroccan payment rails (Stripe unavailable in Morocco), priced out of reach.
- **Gulf halaqat platforms (Kuttab.net, Halaqat.online, Ethaaf SAR 1000–2500/yr, Halaq Aldhikr):** great domain fit, Hafs-centric, Saudi-priced, no French, no Moroccan compliance.
- **Moroccan players (fragmented/shallow):** Afsay.ma (association admin only), Sary Compta (associative accounting only, PCGE/reçus fiscaux), POSHOPY (water associations), Taaouniaty (coops), Odoo integrators (services, not SaaS).

**The white space nobody fills:** ONE product combining (a) Dahir-1958 association administration, (b) member engagement (QR attendance, hifz tracking incl. Warsh riwaya, parent alerts), (c) light PCGE-compliant accounting with receipts, (d) Moroccan payments, (e) AR/FR bilingual.

**Must-haves validated across all successful players:**
1. Arabic-first RTL + French
2. Mobile-friendly attendance (teacher marks in seconds; offline tolerance)
3. **WhatsApp integration** (absence alerts, payment links, monthly reports) — the #1 channel
4. Local payments: YouCan Pay (CashPlus top-ups for unbanked families!), PayZone, CMI, CIH Pay
5. Reports for authorities (annual moral/financial report, FEC export, INDH/bailleur reporting)
6. Multi-branch/federation dashboards (Ethaaf prices on this)
7. Price anchor: 50–200 MAD/mo self-serve. Anything ≥$50/mo dies here.

## 3. Recommended positioning & pricing

**Positioning:** «المنصة الرقمية للجمعيات المغربية» — run your whole association (members, activities, money, projects) in Arabic or French, from any phone. Start with dar-al-quran/kouttab vertical (acute pain, fee-paying members) then expand to general associations — same engine.

| Plan | Price | Limits | Notes |
|------|-------|--------|-------|
| مجاني | 0 MAD | ≤50 members, 1 admin, core features | Land-and-expand; watermark-free |
| أساسي | 99 MAD/mo | ≤300 members, 3 staff accounts, WhatsApp alerts | |
| متقدم | 199 MAD/mo | Unlimited members, accounting exports, federation view, API | |
| مؤسسات | Quote | Multi-branch, onboarding, support SLA | Federations/Habous networks |

Annual prepay discount (~2 months free) improves cash flow and fights churn; Ramadan enrollment seasonality argues for academic-year-aligned billing.

## 4. Architecture decision: tenancy

Two viable paths:

- **Option A — shared DB, `associationId` column everywhere.** "Proper" SaaS; but touches all ~70 API routes, every query, every unique constraint. 3–6 weeks of careful refactor + high regression risk with zero tests today.
- **Option B — DB-per-tenant (recommended for ASAP).** Central control-plane DB holds tenants (slug/subdomain, plan, status, db url). App resolves host → tenant → cached PrismaClient pointed at tenant DB. Existing single-tenant code runs **unchanged** per tenant. Isolation = strongest possible (data breach of one tenant ≠ all); per-tenant backup/restore/export trivially easy (a selling point for CNDP compliance); migration path to Option A later if ever needed. Trade-off: cross-tenant analytics requires control-plane aggregation (fine at this scale).

**Decision: Option B now, keep door open to A.**

Tenant resolution: `{slug}.neimaa.ma` subdomains + custom domain mapping (CNAME) later.

## 5. Roadmap

### Phase 0 — Hygiene (days)
- [x] Rotate secrets for prod; add `.env.example`
- [x] Fix 18 lint errors (0 errors; 33 warnings = legacy fetch-on-mount pattern, tracked)
- [ ] Rate limiter behind interface (Redis-ready)
- [ ] Backup script (`pg_dump` cron) + restore doc
- [ ] Seed → idempotent bootstrap script reusable for new tenant DBs

### Phase 1 — SaaS foundation (week 1–2) ✅ implemented & smoke-tested
- [x] Control plane: `Tenant` model (slug, name, plan, status, dbUrl, customDomain, trialEndsAt)
- [x] Tenant resolution (`src/lib/tenants.ts`, host header → cached dbUrl)
- [x] Per-tenant Prisma facade (`src/lib/prisma.ts`) — all 106 existing files tenant-aware with zero edits
- [x] Tenant DB provisioning (inline + `scripts/provision-tenant.ts`)
- [x] Marketing landing page `/` with pricing (AR; FR in Phase 3)
- [x] Self-serve signup `/start` + slug checker + inline provisioning (smoke-tested end-to-end incl. login on tenant subdomain)

### Phase 2 — Monetization (week 3–4) ✅ implemented & smoke-tested
- [x] Plan enforcement: member caps per tier (`src/lib/plan-enforce.ts`) wired into member create/import/public signup; expired paid periods degrade to FREE limits; suspension gate in proxy + `/suspended` page
- [x] YouCan Pay integration (`src/lib/payments/youcan.ts`): tokenize → hosted payment-form redirect, HMAC-SHA256 webhook verification, idempotent activation (`/api/webhooks/youcan`), annual prepay pricing
- [ ] Invoice/receipt generation (TenantPayment rows recorded; PDF receipts pending)
- [x] Platform owner console `/platform` (apex-only): tenant list, suspend/activate/retry-provision; `/billing` page with usage meter & upgrades

### Phase 3 — Market fit (month 2) — i18n ✅ implemented
- [x] French i18n layer: full AR/FR dictionaries (~15 namespaces), per-association default locale (AssociationInfo.defaultLocale) + user cookie override, dynamic lang/dir, localized metadata/dates/role labels; all surfaces swept
- [ ] WhatsApp notification channel (via WhatsApp Cloud API or CallMeBot-style gateway initially)
- [x] Authority-ready exports: print-optimized annual moral & financial report page (`/financial/annual-report`, browser → PDF) + PCGE-style journal sheet (7142/7143/6xx) in the XLSX export
- [x] PWA: manifest + icons + service worker (static cache, offline fallback page `/offline`); queued offline attendance deferred

### Phase 4 — Growth (month 3+)
- [ ] Custom domains, federation dashboards
- [ ] Public transparency pages per association (donors love this; drives SEO)
- [ ] Warsh-mode hifz tracking toggle (Moroccan riwaya differentiator vs Gulf products)
- [ ] Partner program: Habous delegations, morshidat networks, INDH-funded orgs

## 6. Go-public checklist
- [ ] CNDP declaration (Morocco law 09-08) for personal-data processing — field already exists in schema; do it
- [ ] Terms of service + privacy policy pages (AR/FR)
- [ ] Real domain + wildcard SSL for `*.domain` subdomains
- [ ] Error monitoring (Sentry free tier) + uptime ping
- [ ] Seeded demo tenant for sales demos
- [ ] Data export/delete per tenant (GDPR-style goodwill + CNDP)
