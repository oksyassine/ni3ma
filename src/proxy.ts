import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/lib/rbac";
import { getTenantRecordForHost, normalizeHost } from "@/lib/tenants";

const DASHBOARD_ROLES: Record<string, Role[]> = {
  admin: ["ADMIN", "BUREAU_RW"],
  bureau: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  financial: ["ADMIN", "FINANCIAL"],
  // Section dashboards: maktab members (BUREAU/BUREAU_RW) and FINANCIAL get
  // read access via maktab membership, in addition to the section-specific roles.
  educational: ["ADMIN", "EDUCATIONAL", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  social:      ["ADMIN", "SOCIAL", "BAHT_IJTIMA3I_TEAM", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  quran:       ["ADMIN", "QURAN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  qada:        ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  media:       ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
  volunteer: ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"],
  platform: ["ADMIN"],
  member: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER", "BAHT_IJTIMA3I_TEAM"],
};

// Role gates for API route prefixes that don't share a segment with a
// dashboard path. Belt-and-suspenders: the route handlers also enforce
// their own checks, but if a future route forgets, the proxy still rejects.
const API_ROLE_PREFIXES: { prefix: string; allowed: Role[] }[] = [
  { prefix: "/api/financial/", allowed: ["ADMIN", "FINANCIAL", "BUREAU", "BUREAU_RW"] },
  { prefix: "/api/members/",   allowed: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER"] },
  { prefix: "/api/admin/",     allowed: ["ADMIN", "BUREAU_RW"] },
  { prefix: "/api/platform/",  allowed: ["ADMIN"] },
  { prefix: "/api/billing/",   allowed: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"] },
  { prefix: "/api/messages/",  allowed: ["ADMIN", "BUREAU", "BUREAU_RW"] },
  { prefix: "/api/audit-logs", allowed: ["ADMIN", "BUREAU", "BUREAU_RW"] },
  { prefix: "/api/bureau/",    allowed: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"] },
  { prefix: "/api/export/",    allowed: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"] },
];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Allow marketing + auth + public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/start") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/suspended") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/signup") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/start") ||
    pathname.startsWith("/api/webhooks") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/offline") ||
    pathname === "/terms" ||
    pathname === "/privacy"
  ) {
    return NextResponse.next();
  }

  // Tenant lifecycle gate. Platform hosts have no tenant record, so the
  // lookup returns null and this never fires there. Non-ACTIVE tenants can
  // only reach /billing (renewal). For POST/PATCH/DELETE to /api/* on a
  // suspended tenant, return 403 instead of redirecting — a redirect would
  // turn a POST into a GET and silently lose the request body.
  const host = normalizeHost(req.headers.get("host"));
  if (host && !pathname.startsWith("/billing") && !pathname.startsWith("/api/billing")) {
    const tenant = await getTenantRecordForHost(host);
    if (tenant && tenant.status !== "ACTIVE") {
      const isApiWrite = pathname.startsWith("/api/")
        && req.method !== "GET"
        && req.method !== "HEAD"
        && req.method !== "OPTIONS";
      if (isApiWrite) {
        return NextResponse.json(
          { error: "الفضاء غير نشط. جددوا الاشتراك.", code: "TENANT_INACTIVE" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL(`/suspended?status=${tenant.status.toLowerCase()}`, req.url));
    }
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Dashboard route role check
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && DASHBOARD_ROLES[segment]) {
    const userRoles = (req.auth.user?.roles ?? []) as Role[];
    const allowed = DASHBOARD_ROLES[segment];
    if (!userRoles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // API route role gate (defense-in-depth). Matched on path prefix.
  if (pathname.startsWith("/api/")) {
    const userRoles = (req.auth.user?.roles ?? []) as Role[];
    for (const rule of API_ROLE_PREFIXES) {
      if (pathname.startsWith(rule.prefix)) {
        if (!userRoles.some((r) => rule.allowed.includes(r))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        break;
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
