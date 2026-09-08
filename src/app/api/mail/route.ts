import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const createSchema = z.object({
  direction: z.enum(["INCOMING", "OUTGOING"]).default("INCOMING"),
  reference: z.string().min(1).max(60),
  subject: z.string().min(2).max(500),
  correspondent: z.string().min(2).max(300),
  mailDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")),
  channel: z.string().max(120).nullish(),
  status: z.enum(["PENDING", "PROCESSED", "ARCHIVED"]).default("PENDING"),
  responseDueAt: dateStr,
  respondedAt: dateStr,
  fileUrl: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
});

// Computes the next serial number for a (direction, year) pair. The
// MailItem reference is "{prefix}/{year}/{seq}" where prefix is و for
// incoming and ص for outgoing. Concurrent requests are caught by the
// DB unique constraint; the POST handler retries with a fresh sequence.
async function nextReference(direction: "INCOMING" | "OUTGOING"): Promise<string> {
  const prefix = direction === "INCOMING" ? "و" : "ص";
  const year = new Date().getFullYear();
  const prefixYear = `${prefix}/${year}/`;
  const last = await prisma.mailItem.findFirst({
    where: { direction, reference: { startsWith: prefixYear } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNum = last ? parseInt(last.reference.slice(prefixYear.length), 10) : 0;
  const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
  return `${prefixYear}${String(next).padStart(3, "0")}`;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cap for safety — long-running associations can have thousands of
  // correspondence rows. Clients get a `total` field to know there's more.
  const MAX_TAKE = 500;
  const [items, total] = await Promise.all([
    prisma.mailItem.findMany({ orderBy: { mailDate: "desc" }, take: MAX_TAKE }),
    prisma.mailItem.count(),
  ]);
  return NextResponse.json({ items, total, cap: MAX_TAKE });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  // Race-safe serial number: if a parallel request took the same number,
  // the DB unique constraint fails and we retry with a fresh sequence.
  const direction = parsed.data.direction;
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = parsed.data.reference || (await nextReference(direction));
    try {
      const created = await prisma.mailItem.create({
        data: { ...parsed.data, reference },
      });
      await recordAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "mail_item",
        entityId: created.id,
        after: created,
        req,
      });
      revalidateBureau("mail");
      return NextResponse.json(created, { status: 201 });
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
        if (parsed.data.reference) {
          return NextResponse.json(
            { error: "هذا الرقم المسلسل مستعمل بالفعل لنفس الاتجاه" },
            { status: 409 }
          );
        }
        continue;
      }
      throw e;
    }
  }
  return NextResponse.json(
    { error: "تعذّر تخصيص رقم مسلسل بعد عدة محاولات" },
    { status: 503 }
  );
}
