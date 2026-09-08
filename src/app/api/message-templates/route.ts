import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const createSchema = z.object({
  key: z.string().min(2).max(80).regex(/^[a-z0-9._-]+$/, "Use a-z, 0-9, . _ -"),
  name: z.string().min(2).max(300),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]).default("WHATSAPP"),
  body: z.string().min(1).max(4000),
  variables: z.string().max(2000).nullish(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const templates = await prisma.messageTemplate.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  try {
    const created = await prisma.messageTemplate.create({ data: parsed.data });
    await recordAudit({ userId: session.user.id, action: "CREATE", entity: "message_template", entityId: created.id, after: created, req });
    revalidateBureau("messages");
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "يوجد قالب بنفس المعرّف" }, { status: 409 });
    }
    throw e;
  }
}
