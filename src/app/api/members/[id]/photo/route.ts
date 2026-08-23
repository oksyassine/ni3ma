import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isValidCuid } from "@/lib/validations/id";
import { isAdmin, isBureauRW } from "@/lib/permissions";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // CRITICAL: id flows into the filename. Reject anything that's not a CUID
  // BEFORE composing the path or writing the file. Prevents path traversal.
  if (!isValidCuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Members can upload their own photo; admins/bureau-RW can upload for anyone.
  const isSelf = id === session.user.id;
  if (!isSelf && !isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Confirm the member exists BEFORE writing
  const exists = await prisma.member.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "الصورة أكبر من 5 ميغابايت" }, { status: 400 });
  }

  // Sniff magic bytes to defend against MIME spoofing
  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasImageMagicBytes(buf)) {
    return NextResponse.json({ error: "الملف ليس صورة صالحة" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `member-${id}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "members");
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buf);

  const photoUrl = `/uploads/members/${filename}`;
  const member = await prisma.member.update({
    where: { id },
    data: { photoUrl },
    select: { id: true, photoUrl: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member_photo",
    entityId: id,
    after: member,
    req,
  });

  return NextResponse.json(member);
}

function hasImageMagicBytes(buf: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WEBP: "RIFF....WEBP"
  if (buf.length >= 12
    && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}
