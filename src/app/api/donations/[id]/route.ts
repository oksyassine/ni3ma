import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { postDonation } from "@/lib/journal";
import { isAdmin, isFinancial, isBureauRW } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.donation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.donorName !== undefined) data.donorName = body.isAnonymous ? null : body.donorName;
  if (body.donorPhone !== undefined) data.donorPhone = body.donorPhone || null;
  let amountChanged = false;
  if (body.amount !== undefined) {
    const n = parseFloat(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
    amountChanged = Number(before.amount) !== n;
    data.amount = n;
  }
  if (body.section !== undefined) data.section = body.section;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.donationDate !== undefined) {
    const d = new Date(body.donationDate);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.donationDate = d;
  }
  if (body.isAnonymous !== undefined) data.isAnonymous = body.isAnonymous;
  if (body.notes !== undefined) data.notes = body.notes;
  let payStateChanged = false;
  if (body.markPaid === true) {
    data.isPaid = true;
    data.paidAt = new Date();
    payStateChanged = !before.isPaid;
  }
  if (body.isPaid !== undefined) {
    payStateChanged = before.isPaid !== body.isPaid;
    data.isPaid = body.isPaid;
  }

  const updated = await prisma.donation.update({ where: { id }, data });

  // When the donation's amount changes after it was paid, the prior
  // journal entry is now wrong. Post a new entry (the bureau can
  // verify and adjust the originating account). For now we re-post
  // (additive — old entry remains for audit trail).
  if ((amountChanged || payStateChanged) && updated.isPaid) {
    await postDonation(updated.id).catch((err) =>
      console.error("[journal] postDonation (PATCH re-post) failed", err),
    );
  }

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "donation",
    entityId: id,
    before: { amount: before.amount, isPaid: before.isPaid },
    after: { amount: Number(updated.amount), isPaid: updated.isPaid, reposted: amountChanged || payStateChanged },
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Deletion: ADMIN, BUREAU_RW (ra2is), or FINANCIAL. BUREAU READ is not enough.
  if (!isAdmin(session.user.roles) && !isFinancial(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.donation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.donation.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "donation",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
