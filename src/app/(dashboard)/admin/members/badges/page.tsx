import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n/server";

async function ensureTokens() {
  const missing = await prisma.member.findMany({
    where: { checkinToken: null, isActive: true },
    select: { id: true },
  });
  for (const m of missing) {
    await prisma.member.update({
      where: { id: m.id },
      data: { checkinToken: `c_${randomBytes(8).toString("hex")}` },
    });
  }
}

export default async function BadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; section?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    redirect("/unauthorized");
  }

  const sp = await searchParams;
  await ensureTokens();
  const { t } = await getT();

  const where: Record<string, unknown> = { isActive: true };
  if (sp.ids) {
    where.id = { in: sp.ids.split(",") };
  } else if (sp.section) {
    where.sections = { some: { section: sp.section, isActive: true } };
  }

  const members = await prisma.member.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      registrationNumber: true,
      memberType: true,
      checkinToken: true,
      photoUrl: true,
    },
    orderBy: { registrationNumber: "asc" },
    take: 200,
  });

  const h = await headers();
  const host = h.get("host") ?? "neimaa.carbtrim.online";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  const badges = await Promise.all(
    members.map(async (m) => {
      const url = `${baseUrl}/checkin/${m.checkinToken}`;
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 200 });
      return { ...m, qr };
    })
  );

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold">{t("members.badges.title")}</h1>
          <p className="text-muted-foreground">{t("members.badges.count", { count: badges.length })}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { background: white; }
          .badge-grid { gap: 4mm !important; }
        }
      `}</style>

      <div className="badge-grid grid grid-cols-2 md:grid-cols-3 gap-3 print:gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className="border-2 border-primary rounded-xl p-3 bg-white text-center break-inside-avoid"
            style={{ pageBreakInside: "avoid" }}
          >
            <div className="text-xs font-bold text-primary mb-1">{t("members.badges.org")}</div>
            {b.photoUrl ? (
              <img src={b.photoUrl} alt={b.fullName} className="w-16 h-16 rounded-full object-cover mx-auto mb-2" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center text-2xl">
                {b.memberType === "CHILD" ? "👦" : "👤"}
              </div>
            )}
            <div className="text-sm font-bold leading-tight">{b.fullName}</div>
            <div className="text-xs text-muted-foreground">{t("members.badges.number", { number: b.registrationNumber })}</div>
            <img src={b.qr} alt="QR" className="w-32 h-32 mx-auto mt-2" />
            <div className="text-[10px] text-muted-foreground mt-1">{t("members.badges.scanToCheckin")}</div>
          </div>
        ))}
        {badges.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">{t("members.badges.none")}</p>
        )}
      </div>
    </div>
  );
}
