import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";
import { enqueueAndSend, renderTemplate } from "@/lib/messaging";

const recipientSchema = z.object({
  phone: z.string().min(5).max(40),
  memberId: z.string().nullish(),
  name: z.string().max(300).nullish(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const sendSchema = z.object({
  templateKey: z.string().min(1).max(80),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]).default("WHATSAPP"),
  recipients: z.array(recipientSchema).min(1).max(500),
});

// GET: paginated send log
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status === "QUEUED" || status === "SENT" || status === "DELIVERED" || status === "FAILED") {
    where.status = status;
  }
  const messages = await prisma.messageOut.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { member: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json({ messages });
}

// POST: send a template-rendered message to many recipients
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const template = await prisma.messageTemplate.findUnique({ where: { key: parsed.data.templateKey } });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "القالب غير موجود أو غير مفعّل" }, { status: 404 });
  }

  const results = await Promise.all(
    parsed.data.recipients.map((r) => {
      const body = renderTemplate(template.body, {
        name: r.name ?? "",
        member: r.name ?? "",
        phone: r.phone,
        ...(r.variables ?? {}),
      });
      return enqueueAndSend({
        channel: parsed.data.channel,
        to: r.phone,
        body,
        templateKey: template.key,
        variables: r.variables,
        recipientMemberId: r.memberId ?? undefined,
        recipientName: r.name ?? undefined,
      });
    })
  );

  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "message_out",
    entityId: parsed.data.templateKey,
    after: { template: parsed.data.templateKey, recipients: results.length, success, failed },
    req,
  });
  revalidateBureau("messages");
  revalidateBureau("reminders");

  return NextResponse.json({ success, failed, results });
}
