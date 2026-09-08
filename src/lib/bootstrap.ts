import type { PrismaClient } from "@prisma/client";

export type BootstrapOptions = {
  associationName: string;
  city?: string | null;
  adminName: string;
  adminUsername: string;
  /** Pre-hashed password (bcrypt). Required. */
  adminPasswordHash: string;
  /** When the platform owner bootstraps a tenant for a new customer, the
   *  admin is created INACTIVE so the platform owner has to enable it
   *  after delivering the temporary password out-of-band. */
  adminIsActive?: boolean;
  facebookUrl?: string | null;
};

/**
 * Idempotent tenant-DB bootstrap: admin user + association info + current-year
 * annual programs. Safe to run repeatedly (upserts only).
 */
export async function bootstrapTenant(db: PrismaClient, opts: BootstrapOptions): Promise<{ adminId: string }> {
  const admin = await db.user.upsert({
    where: { username: opts.adminUsername },
    update: {},
    create: {
      username: opts.adminUsername,
      passwordHash: opts.adminPasswordHash,
      fullName: opts.adminName,
      isActive: opts.adminIsActive ?? true,
      roles: { create: { role: "ADMIN" } },
    },
  });

  await db.associationInfo.upsert({
    where: { id: 1 },
    update: { name: opts.associationName },
    create: {
      name: opts.associationName,
      city: opts.city || undefined,
      facebookUrl: opts.facebookUrl || undefined,
    },
  });

  const currentYear = new Date().getFullYear();
  const sections = [
    { section: "EDUCATIONAL" as const, title: "البرنامج التربوي السنوي" },
    { section: "SOCIAL" as const, title: "البرنامج الاجتماعي السنوي" },
    { section: "QURAN" as const, title: "برنامج القرآن الكريم السنوي" },
  ];
  for (const s of sections) {
    await db.annualProgram.upsert({
      where: { section_year: { section: s.section, year: currentYear } },
      update: {},
      create: {
        section: s.section,
        year: currentYear,
        title: `${s.title} ${currentYear}`,
        createdBy: admin.id,
      },
    });
  }

  return { adminId: admin.id };
}
