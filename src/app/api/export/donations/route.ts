import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFinancial } from "@/lib/permissions";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles) && !session.user.roles.includes("BUREAU") && !session.user.roles.includes("BUREAU_RW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const donations = await prisma.donation.findMany({
    orderBy: { donationDate: "desc" },
    include: {
      project: { select: { name: true } },
      campaign: { select: { name: true } },
      recorder: { select: { fullName: true } },
    },
  });
  const rows = donations.map((d) => ({
    date: d.donationDate.toISOString().slice(0, 10),
    receipt: d.receiptNumber ?? "",
    donorName: d.isAnonymous ? "ANONYME" : (d.donorName ?? ""),
    donorCin: d.donorCin ?? "",
    donorPhone: d.donorPhone ?? "",
    amount: d.amount.toString(),
    section: d.section,
    campaign: d.campaign?.name ?? "",
    project: d.project?.name ?? "",
    status: d.isPaid ? "PAID" : "PLEDGED",
    notes: d.notes ?? "",
    recorder: d.recorder?.fullName ?? "",
  }));
  const csv = toCsv(rows, [
    { key: "date", header: "Date" },
    { key: "receipt", header: "Receipt #" },
    { key: "donorName", header: "Donor" },
    { key: "donorCin", header: "CIN" },
    { key: "donorPhone", header: "Phone" },
    { key: "amount", header: "Amount MAD" },
    { key: "section", header: "Section" },
    { key: "campaign", header: "Campaign" },
    { key: "project", header: "Project" },
    { key: "status", header: "Status" },
    { key: "notes", header: "Notes" },
    { key: "recorder", header: "Recorded by" },
  ]);
  return csvResponse(csv, `donations-${new Date().toISOString().slice(0, 10)}.csv`);
}
