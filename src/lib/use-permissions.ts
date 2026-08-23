"use client";

import { useSession } from "next-auth/react";
import type { Section } from "@prisma/client";
import type { Role } from "@/lib/rbac";

// Single source of truth for client-side permission checks. Mirrors the API
// gates in src/lib/permissions.ts. Use this to hide/disable UI elements that
// would otherwise call protected endpoints and 403.
//
// Hierarchy (highest → lowest):
//   ADMIN                      → full RW everywhere
//   BureauPermission(RW)       → RW across all sections
//   BureauPermission(READ)     → READ across all sections
//   SectionPermission(ADMIN)   → RW + can grant within section
//   SectionPermission(RW)      → RW within section
//   SectionPermission(READ)    → READ-only within section
//   FINANCIAL                  → bypass for cross-section financial views
//   BAHT_IJTIMA3I_TEAM         → exclusive read on full beneficiary records

export type PermissionsAPI = {
  loading: boolean;
  isAdmin: boolean;
  isBureauRW: boolean;
  hasBureauRead: boolean;
  isFinancial: boolean;
  isBahtTeam: boolean;
  hasSectionRead: (s: Section) => boolean;
  canWriteSection: (s: Section) => boolean;
  isSectionAdmin: (s: Section) => boolean;
  canApproveSection: (s: Section) => boolean;
  roles: Role[];
};

export function usePermissions(): PermissionsAPI {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const roles = (session?.user?.roles ?? []) as Role[];
  const sectionLevels = session?.user?.sectionLevels ?? {};
  const bureauLevel = session?.user?.bureauLevel;

  const isAdmin = roles.includes("ADMIN");
  const isBureauRW = isAdmin || bureauLevel === "RW";
  const hasBureauRead = isBureauRW || bureauLevel === "READ" || roles.includes("BUREAU");
  const isFinancial = isAdmin || roles.includes("FINANCIAL");
  const isBahtTeam = isAdmin || roles.includes("BAHT_IJTIMA3I_TEAM");

  const sectionLevel = (s: Section) => sectionLevels[s];

  const hasSectionRead = (s: Section) => isAdmin || hasBureauRead || sectionLevel(s) != null;
  const canWriteSection = (s: Section) => {
    if (isAdmin || isBureauRW) return true;
    const lvl = sectionLevel(s);
    return lvl === "RW" || lvl === "ADMIN";
  };
  const isSectionAdmin = (s: Section) => isAdmin || isBureauRW || sectionLevel(s) === "ADMIN";
  // Approve volunteer hours: ADMIN, BUREAU_RW, or section admin of the matching section
  const canApproveSection = (s: Section) => isAdmin || isBureauRW || sectionLevel(s) === "ADMIN";

  return {
    loading,
    isAdmin,
    isBureauRW,
    hasBureauRead,
    isFinancial,
    isBahtTeam,
    hasSectionRead,
    canWriteSection,
    isSectionAdmin,
    canApproveSection,
    roles,
  };
}
