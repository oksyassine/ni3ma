import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { hasSectionRW, hasSectionRead } from "@/lib/permissions";
import type { HifzGrade } from "@prisma/client";

function parseFiniteInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasSectionRead(session, "QURAN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const academicYearId = searchParams.get("academicYearId");

  const where: Record<string, unknown> = {};
  if (memberId) where.memberId = memberId;
  if (academicYearId) where.academicYearId = academicYearId;

  const records = await prisma.quranProgress.findMany({
    where,
    include: {
      member: { select: { id: true, fullName: true, registrationNumber: true } },
      recorder: { select: { fullName: true } },
    },
    orderBy: { recitationDate: "desc" },
    take: memberId ? 200 : 100,
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasSectionRW(session, "QURAN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const recDate = new Date(body.recitationDate);
  if (Number.isNaN(recDate.getTime())) {
    return NextResponse.json({ error: "تاريخ التسميع غير صالح" }, { status: 400 });
  }
  const academicYearId = await getCurrentAcademicYearId();

  const created = await prisma.quranProgress.create({
    data: {
      memberId: body.memberId,
      recitationDate: recDate,
      currentSurah: body.currentSurah ?? null,
      surahFromAyah: parseFiniteInt(body.surahFromAyah),
      surahToAyah: parseFiniteInt(body.surahToAyah),
      hizb: parseFiniteInt(body.hizb),
      juz: parseFiniteInt(body.juz),
      pagesMemorized: parseFiniteInt(body.pagesMemorized),
      hifzGrade: (body.hifzGrade ?? null) as HifzGrade | null,
      tajweedMakharij: parseFiniteInt(body.tajweedMakharij),
      tajweedSifaat: parseFiniteInt(body.tajweedSifaat),
      tajweedNoonMeem: parseFiniteInt(body.tajweedNoonMeem),
      tajweedMeemSakinah: parseFiniteInt(body.tajweedMeemSakinah),
      tajweedMudood: parseFiniteInt(body.tajweedMudood),
      tajweedLamTareef: parseFiniteInt(body.tajweedLamTareef),
      tajweedQalqala: parseFiniteInt(body.tajweedQalqala),
      tajweedTarqeeqTafkheem: parseFiniteInt(body.tajweedTarqeeqTafkheem),
      tajweedRaa: parseFiniteInt(body.tajweedRaa),
      tajweedWaqf: parseFiniteInt(body.tajweedWaqf),
      tajweedImalah: parseFiniteInt(body.tajweedImalah),
      tajweedFluency: parseFiniteInt(body.tajweedFluency),
      tajweedOverall: parseFiniteInt(body.tajweedOverall),
      notes: body.notes ?? null,
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "quran_progress",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
