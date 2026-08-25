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

  // Tenant lifecycle gate: non-ACTIVE tenants (pending provisioning,
  // provision failure, suspension for non-payment) can only reach billing
  // — that's how they pay to come back. Everything else bounces to
  // /suspended, which explains the state. Platform hosts have no tenant
  // record, so the lookup returns null and this never fires there.
  const host = normalizeHost(req.headers.get("host"));
  if (host && !pathname.startsWith("/billing") && !pathname.startsWith("/api/billing")) {
    const tenant = await getTenantRecordForHost(host);
    if (tenant && tenant.status !== "ACTIVE") {
      return NextResponse.redirect(new URL(`/suspended?status=${tenant.status.toLowerCase()}`, req.url));
    }
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check role-based access for dashboard routes
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && DASHBOARD_ROLES[segment]) {
    const userRoles = (req.auth.user?.roles ?? []) as Role[];
    const allowed = DASHBOARD_ROLES[segment];
    if (!userRoles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
