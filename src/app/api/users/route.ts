import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashSync } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: { roles: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      roles: u.roles.map((r) => r.role),
      createdAt: u.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, password, fullName, email, phone, roles } = await req.json();

  if (!username || !password || !fullName || !roles?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashSync(password, 12),
      fullName,
      email,
      phone,
      roles: {
        create: roles.map((role: string) => ({ role })),
      },
    },
    include: { roles: true },
  });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    roles: user.roles.map((r) => r.role),
  }, { status: 201 });
}
