import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { HifzGrade } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasSectionRW(session, "QURAN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.quranProgress.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const intFields = [
    "surahFromAyah", "surahToAyah", "hizb", "juz", "pagesMemorized",
    "tajweedMakharij", "tajweedSifaat", "tajweedNoonMeem", "tajweedMeemSakinah",
    "tajweedMudood", "tajweedLamTareef", "tajweedQalqala", "tajweedTarqeeqTafkheem",
    "tajweedRaa", "tajweedWaqf", "tajweedImalah", "tajweedFluency", "tajweedOverall",
  ];
  for (const f of intFields) {
    if (body[f] !== undefined) data[f] = body[f] === "" || body[f] === null ? null : parseInt(body[f]);
  }
  if (body.recitationDate !== undefined) data.recitationDate = new Date(body.recitationDate);
  if (body.currentSurah !== undefined) data.currentSurah = body.currentSurah || null;
  if (body.hifzGrade !== undefined) data.hifzGrade = (body.hifzGrade || null) as HifzGrade | null;
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.quranProgress.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "quran_progress",
    entityId: id,
    before,
    after: updated,
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasSectionRW(session, "QURAN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.quranProgress.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.quranProgress.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "quran_progress",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
