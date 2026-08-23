export type Role =
  | "ADMIN"
  | "BUREAU"
  | "FINANCIAL"
  | "EDUCATIONAL"
  | "SOCIAL"
  | "QURAN"
  | "MEMBER"
  | "BAHT_IJTIMA3I_TEAM"
  // Synthetic roles — derived from permission tables, never stored in the DB.
  // Used to gate UI elements that need to distinguish higher privilege levels.
  | "BUREAU_RW"      // BureauPermission(level=RW)
  | "SECTION_ADMIN"; // SectionPermission(level=ADMIN) on at least one section

export const DASHBOARD_ACCESS: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/bureau": ["ADMIN", "BUREAU"],
  "/financial": ["ADMIN", "FINANCIAL"],
  "/educational": ["ADMIN", "EDUCATIONAL"],
  "/social": ["ADMIN", "SOCIAL", "BAHT_IJTIMA3I_TEAM"],
  "/quran": ["ADMIN", "QURAN"],
  "/volunteer": ["ADMIN", "BUREAU", "EDUCATIONAL", "SOCIAL", "QURAN"],
  "/member": ["ADMIN", "BUREAU", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER", "BAHT_IJTIMA3I_TEAM"],
};

export function hasAccess(userRoles: Role[], path: string): boolean {
  const dashboardPath = "/" + path.split("/").filter(Boolean)[0];
  const allowedRoles = DASHBOARD_ACCESS[dashboardPath];
  if (!allowedRoles) return false;
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function getAccessibleDashboards(userRoles: Role[]): string[] {
  return Object.entries(DASHBOARD_ACCESS)
    .filter(([, roles]) => userRoles.some((r) => roles.includes(r)))
    .map(([path]) => path);
}

export function getDefaultDashboard(userRoles: Role[]): string {
  if (userRoles.includes("ADMIN")) return "/admin";
  if (userRoles.includes("BUREAU")) return "/bureau";
  if (userRoles.includes("FINANCIAL")) return "/financial";
  if (userRoles.includes("EDUCATIONAL")) return "/educational";
  if (userRoles.includes("SOCIAL")) return "/social";
  if (userRoles.includes("QURAN")) return "/quran";
  if (userRoles.includes("BAHT_IJTIMA3I_TEAM")) return "/social";
  return "/member";
}

export const DASHBOARD_LABELS: Record<string, string> = {
  "/admin": "لوحة الإدارة",
  "/bureau": "المكتب المسير",
  "/financial": "المالية",
  "/educational": "القسم التربوي",
  "/social": "القسم الاجتماعي",
  "/quran": "قسم القرآن الكريم",
  "/member": "فضاء المنخرط",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "رئيس",
  BUREAU: "عضو المكتب",
  FINANCIAL: "أمين المال",
  EDUCATIONAL: "مسؤول القسم التربوي",
  SOCIAL: "مسؤول القسم الاجتماعي",
  QURAN: "مسؤول قسم القرآن",
  MEMBER: "منخرط",
  BAHT_IJTIMA3I_TEAM: "فريق البحث الاجتماعي",
  BUREAU_RW: "مكتب — قراءة/كتابة",
  SECTION_ADMIN: "مدير قسم",
};
