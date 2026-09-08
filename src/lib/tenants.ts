import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

// Control-plane client: always pointed at the PRIMARY database (DATABASE_URL)
// where the `tenants` registry lives. Deliberately NOT routed through the
// tenant facade in ./prisma to avoid recursion.
const globalForControl = globalThis as unknown as {
  ni3maControl?: PrismaClient;
};
export const control = globalForControl.ni3maControl ?? new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } });
if (process.env.NODE_ENV !== "production") globalForControl.ni3maControl = control;

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "neimaa.carbtrim.online").toLowerCase().replace(/^www\./, "");

export const RESERVED_SLUGS = new Set([
  // reserved infrastructure
  "www", "app", "admin", "api", "mail", "smtp", "ftp", "ns1", "ns2",
  "static", "cdn", "blog", "help", "support", "status", "root",
  "shell", "panel", "dashboard", "console", "internal",
  // public/marketing/auth routes
  "start", "login", "signup", "invite", "checkin", "p", "pricing",
  "unauthorized", "suspended", "offline", "billing", "platform",
  // product surface — block impersonation of brand/infra words
  "ni3ma", "tenants", "platforms", "super", "owner", "system",
  // reserved TLD-like and DNS-ish
  "test", "staging", "dev", "prod", "demo", "sandbox",
  "cpanel", "webmail", "phpmyadmin", "mysql",
  // security-sensitive strings
  "auth", "oauth", "sso", "account", "accounts", "billing-admin",
  "api-admin", "admin-panel", "tenants-admin",
]);

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  dbUrl: string;
};

export type TenantContext = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  plan: "FREE" | "STARTER" | "PRO" | "CUSTOM";
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

type CacheEntry<T> = { value: T; expiresAt: number };
const POSITIVE_TTL_MS = 30_000;   // tenant → dbUrl mapping
const NEGATIVE_TTL_MS = 5_000;    // unknown host — retry soon so new tenants appear quickly
const positiveCache = new Map<string, CacheEntry<string>>();
const negativeCache = new Map<string, CacheEntry<true>>();

// Cap on cached clients so a host-fuzzing attacker can't grow memory without bound.
const CLIENT_CACHE_MAX = 200;

// Per-dbUrl PrismaClient pool. Clients are cheap to keep alive and reuse
// their own connection pool internally.
const clientCache = new Map<string, PrismaClient>();

function jitter(base: number): number {
  return base + Math.floor(Math.random() * 500);
}

export function invalidateTenant(host: string): void {
  const normalized = normalizeHost(host) ?? host;
  positiveCache.delete(normalized);
  negativeCache.delete(normalized);
  recordCache.delete(normalized);
}

export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  return host.split(":")[0]?.trim().toLowerCase() ?? null;
}

/** Extract a candidate tenant slug from a host on our root domain. */
export function slugFromHost(host: string): string | null {
  if (!host.endsWith("." + ROOT_DOMAIN)) return null;
  const label = host.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!label || label === "www") return null;
  if (!/^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$/.test(label)) return null;
  return label;
}

/**
 * Resolve a request host to its tenant database URL.
 * Returns null when the request belongs to the platform itself
 * (apex/www domain or no host) → caller should use the primary DB.
 *
 * On DB error we do NOT cache the negative result — only confirmed
 * "not found" rows are cached, so a transient registry outage doesn't
 * poison routing for NEGATIVE_TTL_MS.
 */
export async function resolveDbUrlForHost(host: string): Promise<string | null> {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  const cached = positiveCache.get(normalized);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (negativeCache.get(normalized)?.expiresAt && negativeCache.get(normalized)!.expiresAt > now) return null;

  let dbUrl: string | null = null;
  let confirmed = false;
  try {
    const slug = slugFromHost(normalized);
    const where = slug ? { slug } : { customDomain: normalized };
    // Only ACTIVE tenants are routable.
    const tenant = await control.tenant.findFirst({
      where: { ...where, status: "ACTIVE" },
      select: { dbUrl: true },
    });
    dbUrl = tenant?.dbUrl ?? null;
    confirmed = true;
  } catch {
    // Registry unavailable — return null without caching so the next
    // request retries the DB.
    return null;
  }

  if (!confirmed) return null;

  if (dbUrl) {
    positiveCache.set(normalized, { value: dbUrl, expiresAt: now + jitter(POSITIVE_TTL_MS) });
    negativeCache.delete(normalized);
  } else {
    negativeCache.set(normalized, { value: true, expiresAt: now + jitter(NEGATIVE_TTL_MS) });
  }
  return dbUrl;
}

export function getClientForDbUrl(dbUrl: string): PrismaClient {
  let client = clientCache.get(dbUrl);
  if (!client) {
    if (clientCache.size >= CLIENT_CACHE_MAX) {
      // Drop the oldest entry (Map iteration order = insertion order).
      const oldestKey = clientCache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldest = clientCache.get(oldestKey);
        clientCache.delete(oldestKey);
        oldest?.$disconnect().catch(() => {});
      }
    }
    client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    clientCache.set(dbUrl, client);
  }
  return client;
}

/**
 * Resolve the PrismaClient for the CURRENT request based on its Host header.
 * Falls back to the primary DB outside request scope (build step, cron, REPL).
 */
export async function getClientForRequest(): Promise<PrismaClient> {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("host"));
    if (host) {
      const dbUrl = await resolveDbUrlForHost(host);
      if (dbUrl) return getClientForDbUrl(dbUrl);
    }
  } catch {
    // headers() unavailable (static generation / script context) → primary.
  }
  return getPrimaryClient();
}

let primaryClient: PrismaClient | undefined;
export function getPrimaryClient(): PrismaClient {
  primaryClient ??= new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } });
  return primaryClient;
}

/** Build the DATABASE_URL for a prospective tenant slug from the env template. */
export function buildTenantDbUrl(slug: string): string {
  const template = process.env.TENANT_DB_URL_TEMPLATE ?? process.env.DATABASE_URL!;
  // Preferred form: explicit "{slug}" token — replace without URL mangling.
  if (template.includes("{slug}")) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`invalid tenant slug: ${slug}`);
    return template.replace("{slug}", slug);
  }
  // Fallback: derive "<dbname>_t_<slug>" from DATABASE_URL.
  const base = new URL(template);
  const currentDb = decodeURIComponent(base.pathname.split("/").filter(Boolean)[0] ?? "ni3ma");
  base.pathname = "/" + currentDb + "_t_" + slug;
  return base.toString();
}

export function rootDomain(): string {
  return ROOT_DOMAIN;
}

// ---- Full-record lookups (plan enforcement, suspension gating) ----
// Separate cache from routing: includes non-ACTIVE tenants, shorter TTL.

const recordCache = new Map<string, CacheEntry<TenantContext | null>>();

/**
 * Full tenant context for a host (any status). Null when host belongs to the
 * platform itself (apex/www) or no tenant matches. Returns all routable
 * statuses (ACTIVE + SUSPENDED + PROVISION_FAILED + PENDING_PROVISIONING +
 * TRIAL_EXPIRED) so the proxy can decide redirects.
 */
export async function getTenantRecordForHost(host: string): Promise<TenantContext | null> {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  const cached = recordCache.get(normalized);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  let ctx: TenantContext | null = null;
  try {
    const slug = slugFromHost(normalized);
    const where = slug ? { slug } : { customDomain: normalized };
    const t = await control.tenant.findFirst({
      where,
      select: {
        id: true, name: true, slug: true, city: true, plan: true,
        status: true, trialEndsAt: true, currentPeriodEnd: true,
      },
    });
    ctx = t ?? null;
    recordCache.set(normalized, { value: ctx, expiresAt: now + jitter(15_000) });
  } catch {
    // DB error — do NOT cache, surface as null so caller can decide.
    return null;
  }
  return ctx;
}

/** Tenant context for the CURRENT request; null on the platform apex. */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("host"));
    if (!host) return null;
    return getTenantRecordForHost(host);
  } catch {
    return null;
  }
}
