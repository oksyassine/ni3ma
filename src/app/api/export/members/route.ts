import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const members = await prisma.member.findMany({
    orderBy: { registrationNumber: "asc" },
    include: {
      _count: { select: { contributions: true } },
    },
  });
  const rows = members.map((m) => ({
    regNum: m.registrationNumber,
    fullName: m.fullName,
    cin: m.cin ?? "",
    phone: m.phone ?? "",
    type: m.memberType,
    active: m.isActive,
    regDate: m.registrationDate.toISOString().slice(0, 10),
    dob: m.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    gender: m.gender ?? "",
    address: m.address ?? "",
    contributionCount: m._count.contributions,
  }));
  const csv = toCsv(rows, [
    { key: "regNum", header: "Registration #" },
    { key: "fullName", header: "Full name" },
    { key: "cin", header: "CIN" },
    { key: "phone", header: "Phone" },
    { key: "type", header: "Type" },
    { key: "active", header: "Active" },
    { key: "regDate", header: "Registration date" },
    { key: "dob", header: "Date of birth" },
    { key: "gender", header: "Gender" },
    { key: "address", header: "Address" },
    { key: "contributionCount", header: "Contribution weeks" },
  ]);
  return csvResponse(csv, `members-${new Date().toISOString().slice(0, 10)}.csv`);
}
