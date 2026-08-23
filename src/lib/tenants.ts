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
  "www", "app", "admin", "api", "mail", "smtp", "ftp", "ns1", "ns2",
  "start", "login", "signup", "invite", "checkin", "p", "pricing",
  "unauthorized", "static", "cdn", "blog", "help", "support", "status",
  "ni3ma", "platform", "root",
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

// Per-dbUrl PrismaClient pool. Clients are cheap to keep alive and reuse
// their own connection pool internally.
const clientCache = new Map<string, PrismaClient>();

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
 */
export async function resolveDbUrlForHost(host: string): Promise<string | null> {
  const cached = positiveCache.get(host);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (negativeCache.get(host)?.expiresAt && negativeCache.get(host)!.expiresAt > now) return null;

  let dbUrl: string | null = null;
  try {
    const slug = slugFromHost(host);
    const where = slug ? { slug } : { customDomain: host };
    // Only ACTIVE tenants are routable.
    const tenant = await control.tenant.findFirst({
      where: { ...where, status: "ACTIVE" },
      select: { dbUrl: true },
    });
    dbUrl = tenant?.dbUrl ?? null;
  } catch {
    // Registry unavailable — fall back to primary rather than hard-failing.
    return null;
  }

  if (dbUrl) {
    positiveCache.set(host, { value: dbUrl, expiresAt: now + POSITIVE_TTL_MS });
    negativeCache.delete(host);
  } else {
    negativeCache.set(host, { value: true, expiresAt: now + NEGATIVE_TTL_MS });
  }
  return dbUrl;
}

export function getClientForDbUrl(dbUrl: string): PrismaClient {
  let client = clientCache.get(dbUrl);
  if (!client) {
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
 * platform itself (apex/www) or no tenant matches.
 */
export async function getTenantRecordForHost(host: string): Promise<TenantContext | null> {
  const cached = recordCache.get(host);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  let ctx: TenantContext | null = null;
  try {
    const slug = slugFromHost(host);
    const where = slug ? { slug } : { customDomain: host };
    const t = await control.tenant.findFirst({
      where,
      select: {
        id: true, name: true, slug: true, city: true, plan: true,
        status: true, trialEndsAt: true, currentPeriodEnd: true,
      },
    });
    ctx = t ?? null;
  } catch {
    ctx = null;
  }
  recordCache.set(host, { value: ctx, expiresAt: now + 15_000 });
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
