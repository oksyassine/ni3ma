import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (!body.name?.trim() || !body.amount) {
    return NextResponse.json({ error: "اسم البند والمبلغ مطلوبان" }, { status: 400 });
  }
  const count = await prisma.planLineItem.count({ where: { planId: id } });
  const created = await prisma.planLineItem.create({
    data: {
      planId: id,
      name: body.name.trim(),
      amount: parseFloat(body.amount),
      position: count,
    },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "plan_line_item",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
