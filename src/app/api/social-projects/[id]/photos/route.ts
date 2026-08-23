import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isValidCuid } from "@/lib/validations/id";
import { hasSectionRead, hasSectionRW } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

function hasImageMagicBytes(buf: Buffer): boolean {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf.length >= 12
    && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRead(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const photos = await prisma.projectPhoto.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(photos);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // CRITICAL: id flows into a filename — validate strictly before any I/O.
  if (!isValidCuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fd = await req.formData();
  const file = fd.get("photo") as File | null;
  const caption = fd.get("caption") as string | null;
  if (!file) return NextResponse.json({ error: "ملف الصورة مطلوب" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الصورة يتجاوز 5 ميغا" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasImageMagicBytes(buf)) {
    return NextResponse.json({ error: "الملف ليس صورة صالحة" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${id}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "projects");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buf);
  const url = `/uploads/projects/${filename}`;

  const created = await prisma.projectPhoto.create({
    data: {
      projectId: id,
      url,
      caption: caption?.trim() || null,
      uploadedBy: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "project_photo",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
