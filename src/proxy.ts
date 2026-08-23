import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/lib/rbac";

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
  volunteer:   ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"],
  member:      ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER", "BAHT_IJTIMA3I_TEAM"],
};

export default auth((req) => {
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
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/signup") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/start")
  ) {
    return NextResponse.next();
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
