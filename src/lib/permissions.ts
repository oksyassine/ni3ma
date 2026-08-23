import { prisma } from "@/lib/prisma";
import type { Section, PermissionLevel, BureauLevel } from "@prisma/client";
import type { Role } from "@/lib/rbac";

// =============================================================
// Permission helpers — granular access for the new RBAC model.
//
// Hierarchy (highest → lowest):
//   ADMIN role                  → full RW everywhere, can grant anything
//   BureauPermission(RW)        → RW across all sections, can grant SECTION_ADMIN
//   BureauPermission(READ)      → READ across all sections
//   SectionPermission(ADMIN)    → RW in section + can grant RW within section
//   SectionPermission(RW)       → RW in section
//   SectionPermission(READ)     → READ in section, log hours, comment, claim
//                                 only "openForSelfClaim" tasks
//   FINANCIAL role              → bypasses section scoping for financial views
//   BAHT_IJTIMA3I_TEAM role     → exclusive READ on full beneficiary records
//
// Edge-case decisions:
//   • Lockout: refuse to demote/remove the LAST BureauPermission(RW). Only
//     ADMIN role can override (force=true).
//   • Section admin succession: when a member's isActive flips to false,
//     all of their SectionPermission rows are deleted (handled in the
//     member-deactivation API).
//   • Multi-section: each (subject, section) pair is independent.
//   • Comment edits: enforced at the route level (15-min window, no delete).
// =============================================================

export type Subject = { userId?: string; memberId?: string };

export type SessionLite = {
  user: {
    id: string;
    roles: Role[];
  };
};

export function isAdmin(roles: Role[]): boolean {
  return roles.includes("ADMIN");
}

export function isBahtTeam(roles: Role[]): boolean {
  return roles.includes("BAHT_IJTIMA3I_TEAM") || roles.includes("ADMIN");
}

export function isFinancial(roles: Role[]): boolean {
  return roles.includes("FINANCIAL") || roles.includes("ADMIN");
}

// ---------- Bureau ----------

export async function getBureauLevel(subject: Subject): Promise<BureauLevel | null> {
  const where: { user_id?: string; member_id?: string } = {};
  if (subject.userId) {
    const row = await prisma.bureauPermission.findUnique({
      where: { userId: subject.userId },
      select: { level: true },
    });
    return row?.level ?? null;
  }
  if (subject.memberId) {
    const row = await prisma.bureauPermission.findUnique({
      where: { memberId: subject.memberId },
      select: { level: true },
    });
    return row?.level ?? null;
  }
  return null;
}

export async function isBureauRW(session: SessionLite): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  // session.user.id is a User row id when login was via User table; with the
  // current auth setup, member-table logins also use the user.id slot.
  // Both resolve via getBureauLevel below.
  const lvl = await getBureauLevel({ userId: session.user.id })
    ?? await getBureauLevel({ memberId: session.user.id });
  return lvl === "RW";
}

export async function hasBureauRead(session: SessionLite): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  const lvl = await getBureauLevel({ userId: session.user.id })
    ?? await getBureauLevel({ memberId: session.user.id });
  return lvl === "RW" || lvl === "READ";
}

// ---------- Section ----------

export async function getSectionLevel(
  subject: Subject,
  section: Section
): Promise<PermissionLevel | null> {
  if (subject.userId) {
    const row = await prisma.sectionPermission.findUnique({
      where: { userId_section: { userId: subject.userId, section } },
      select: { level: true },
    });
    return row?.level ?? null;
  }
  if (subject.memberId) {
    const row = await prisma.sectionPermission.findUnique({
      where: { memberId_section: { memberId: subject.memberId, section } },
      select: { level: true },
    });
    return row?.level ?? null;
  }
  return null;
}

/** Read access in section (also passes for RW/ADMIN, BUREAU_*, ADMIN, FINANCIAL for fin views). */
export async function hasSectionRead(
  session: SessionLite,
  section: Section
): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  if (await hasBureauRead(session)) return true;
  const lvl = await resolveSectionLevel(session, section);
  return lvl !== null;
}

/** RW in section: SECTION_RW, SECTION_ADMIN, BUREAU_RW, ADMIN. */
export async function hasSectionRW(
  session: SessionLite,
  section: Section
): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  if (await isBureauRW(session)) return true;
  const lvl = await resolveSectionLevel(session, section);
  return lvl === "RW" || lvl === "ADMIN";
}

/** ADMIN in section: SECTION_ADMIN, BUREAU_RW, ADMIN. Used for grant-RW operations. */
export async function hasSectionAdmin(
  session: SessionLite,
  section: Section
): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  if (await isBureauRW(session)) return true;
  const lvl = await resolveSectionLevel(session, section);
  return lvl === "ADMIN";
}

async function resolveSectionLevel(
  session: SessionLite,
  section: Section
): Promise<PermissionLevel | null> {
  // Check User then Member space — a session.user.id can be either.
  const u = await getSectionLevel({ userId: session.user.id }, section);
  if (u) return u;
  const m = await getSectionLevel({ memberId: session.user.id }, section);
  return m;
}

// ---------- Self-assign (SECTION_READ on tasks) ----------

/** Whether a SECTION_READ user is allowed to claim this specific task. */
export function canSelfClaim(
  task: { openForSelfClaim: boolean }
): boolean {
  return task.openForSelfClaim === true;
}

// ---------- Lockout protection ----------

/** Count of BureauPermission rows at RW level. Used to prevent last-RW removal. */
export async function countBureauRW(): Promise<number> {
  return prisma.bureauPermission.count({ where: { level: "RW" } });
}

/** Throws if removing/demoting `subject` would leave 0 BureauRW. ADMIN role bypass via force=true. */
export async function assertBureauRWNotLast(
  subject: Subject,
  force: boolean
): Promise<void> {
  if (force) return;
  const total = await countBureauRW();
  if (total <= 1) {
    // Is the subject the one holding the last RW?
    const lvl = await getBureauLevel(subject);
    if (lvl === "RW") {
      throw new Error("LAST_BUREAU_RW");
    }
  }
}

// ---------- Auto-revoke on member deactivation ----------

/** Wipe all permission rows for a member when they go inactive. */
export async function revokeAllForMember(memberId: string): Promise<void> {
  await Promise.all([
    prisma.sectionPermission.deleteMany({ where: { memberId } }),
    prisma.bureauPermission.deleteMany({ where: { memberId } }),
  ]);
}
