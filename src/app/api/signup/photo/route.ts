import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCuid } from "@/lib/validations/id";
import { writeFile } from "fs/promises";
import { join } from "path";

function hasImageMagicBytes(buf: Buffer): boolean {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf.length >= 12
    && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

// Public endpoint — uploads the profile photo for a *pending* member created
// via /api/signup. Allowed only when the member exists, is inactive (still
// awaiting admin approval), and has no photo yet. After admin approval the
// member becomes active and this path is closed; future photo updates go
// through /api/members/[id]/photo (which requires auth).
//
// Already allowlisted in proxy.ts (under /api/signup prefix).

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const memberId = formData.get("memberId");
  const file = formData.get("photo") as File | null;

  if (!memberId || typeof memberId !== "string") {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }
  if (!isValidCuid(memberId)) {
    return NextResponse.json({ error: "Invalid memberId" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, isActive: true, photoUrl: true, createdAt: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Restricted to pending registrations and only within 24h to avoid abuse.
  if (member.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ageMs = Date.now() - new Date(member.createdAt).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "انتهت فترة رفع الصورة، تواصل مع الإدارة" }, { status: 403 });
  }
  if (member.photoUrl) {
    return NextResponse.json({ error: "تم رفع الصورة سابقا" }, { status: 409 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "الصورة أكبر من 5 ميغابايت" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasImageMagicBytes(buf)) {
    return NextResponse.json({ error: "الملف ليس صورة صالحة" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `member-${memberId}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "members");
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, buf);

  const photoUrl = `/uploads/members/${filename}`;
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { photoUrl },
    select: { id: true, photoUrl: true },
  });
  return NextResponse.json(updated);
}
