import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";
import { buildCardQrPayload } from "@/lib/member-card";
import QRCode from "qrcode";
import { PrintButton } from "../../paperwork/print-button";

// Printable membership card. Renders a 85.6 × 53.98 mm card with photo,
// name, registration number, sections, dues status, and a QR code that
// encodes a signed token used at the attendance kiosk for fast check-in.
// Print → PDF for a wallet-sized card.

export default async function MemberCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      sections: { where: { isActive: true } },
    },
  });
  if (!member) notFound();

  const assoc = await prisma.associationInfo.findUnique({ where: { id: 1 } });
  const duesOk = member.isActive;
  const cardPayload = buildCardQrPayload({
    memberId: member.id,
    registrationNumber: member.registrationNumber,
    name: member.fullName,
  });
  const qrDataUrl = await QRCode.toDataURL(cardPayload, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });

  return (
    <div className="mx-auto max-w-md bg-background p-6 print:p-0">
      <style>{`
        @media print {
          .no-print { display:none }
          body { background:#fff }
          .ni3ma-card {
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
        }
        .ni3ma-card {
          width: 85.6mm; height: 53.98mm;
          border: 1px solid #ccc; border-radius: 6px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: white;
          padding: 6mm;
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("memberCard.title")}</h1>
        <PrintButton />
      </div>

      <div className="ni3ma-card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] opacity-80 leading-tight">{assoc?.name ?? "Ni3ma"}</p>
            <p className="text-xs font-bold mt-0.5 leading-tight">
              #{member.registrationNumber}
            </p>
          </div>
          <p className="text-[10px] opacity-80 leading-tight">
            {member.sections.slice(0, 2).map((s) => t(`sections.${s.section}`)).join(" · ") || t("memberCard.member")}
          </p>
        </div>

        <div className="flex justify-between items-end gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{member.fullName}</p>
            <p className="text-[10px] opacity-90 mt-0.5 leading-tight">
              {duesOk ? t("memberCard.active") : t("memberCard.inactive")}
            </p>
            <p className="text-[10px] opacity-70 mt-0.5 leading-tight" dir="ltr">
              {fmtDate(new Date(), "fr")}
            </p>
          </div>
          <img
            src={qrDataUrl}
            alt={t("memberCard.qrAlt")}
            width={68}
            height={68}
            className="rounded bg-white p-0.5 shrink-0"
          />
        </div>
      </div>

      <p className="no-print text-xs text-muted-foreground mt-3">
        {t("memberCard.printHint")}
      </p>
    </div>
  );
}
