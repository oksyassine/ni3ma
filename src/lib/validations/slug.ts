import { prisma } from "@/lib/prisma";

const SLUG_FORBIDDEN = /[\/\\?#&=.,!:;'"()<>@$%^*\s]/;

export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .replace(/[\s/\\?#&=.,!:;'"()<>@$%^*]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function validateSlugFormat(slug: string): string | null {
  if (!slug || !slug.trim()) return "الرابط مطلوب";
  if (slug.length > 80) return "الرابط طويل جدا (الحد الأقصى 80 حرفا)";
  if (slug.length < 2) return "الرابط قصير جدا";
  if (SLUG_FORBIDDEN.test(slug)) return "الرابط يحتوي على رموز ممنوعة (مسافات، / ? # & = ...)";
  return null;
}

export async function isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
  const existing = await prisma.socialProject.findFirst({
    where: {
      slug,
      ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}
