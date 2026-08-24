import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PROJECT_KIND_LABELS } from "@/lib/project";
import { getT } from "@/lib/i18n/server";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;
  const { t } = await getT();

  const p = await prisma.socialProject.findUnique({
    where: { id },
    include: {
      donations: { select: { amount: true } },
      inKindDonations: { select: { itemName: true, quantity: true, unit: true, estimatedValue: true } },
      tasks: {
        include: {
          assignees: { include: { member: { select: { fullName: true } } } },
          worklogs: true,
        },
      },
      creator: { select: { fullName: true } },
      evaluator: { select: { fullName: true } },
    },
  });
  if (!p) notFound();

  const cashTotal = p.donations.reduce((s, d) => s + Number(d.amount), 0);
  const inKindTotal = p.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
  const tasksTotal = p.tasks.length;
  const tasksDone = p.tasks.filter((t) => t.status === "DONE").length;
  const totalHours = p.tasks.reduce((s, t) => s + t.worklogs.reduce((ws, w) => ws + Number(w.hours), 0), 0);

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold">{t("social.reportTitle")}</h1>
        <button onClick={() => typeof window !== "undefined" && window.print()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" suppressHydrationWarning>
          {t("common.print")}
        </button>
      </div>

      <style>{`@media print { @page { size: A4; margin: 15mm; } body { background: white; } }`}</style>

      <div className="bg-white text-black rounded-lg p-8 print:p-0 max-w-4xl mx-auto">
        <div className="text-center border-b-2 border-primary pb-3 mb-6">
          <h1 className="text-3xl font-bold text-primary">{t("social.assocHeader")}</h1>
          <p className="text-sm">{t("social.kindReportPrefix", { kind: PROJECT_KIND_LABELS[p.kind] })}</p>
        </div>

        <h2 className="text-2xl font-bold mb-1">{p.name}</h2>
        {p.objective && <p className="text-sm text-gray-700 mb-4">{p.objective}</p>}

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr className="border-b"><td className="font-bold py-1 w-40">{t("common.type")}</td><td>{PROJECT_KIND_LABELS[p.kind]}</td></tr>
            {p.targetAudience && <tr className="border-b"><td className="font-bold py-1">{t("social.targetAudienceLabel")}</td><td>{p.targetAudience}</td></tr>}
            {p.location && <tr className="border-b"><td className="font-bold py-1">{t("social.locationLabel")}</td><td>{p.location}</td></tr>}
            {p.partners && <tr className="border-b"><td className="font-bold py-1">{t("social.partnersLabel")}</td><td>{p.partners}</td></tr>}
            {p.startDate && <tr className="border-b"><td className="font-bold py-1">{t("social.startDateLabel")}</td><td>{p.startDate.toISOString().slice(0, 10)}</td></tr>}
            {p.endDate && <tr className="border-b"><td className="font-bold py-1">{t("social.endDateLabel")}</td><td>{p.endDate.toISOString().slice(0, 10)}</td></tr>}
          </tbody>
        </table>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="border rounded p-3 text-center">
            <p className="text-xs text-gray-600">{t("social.beneficiaries")}</p>
            <p className="text-2xl font-bold">{p.actualBeneficiaries ?? p.expectedBeneficiaries ?? "—"}</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-xs text-gray-600">{t("social.donationCollection")}</p>
            <p className="text-2xl font-bold text-green-700">{(cashTotal + inKindTotal).toFixed(0)} {t("social.mad")}</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-xs text-gray-600">{t("social.tabTasks")}</p>
            <p className="text-2xl font-bold">{tasksDone}/{tasksTotal}</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-xs text-gray-600">{t("social.volunteerHoursStat")}</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
          </div>
        </div>

        {p.evaluationScore && (
          <div className="border rounded p-4 mb-4 bg-yellow-50">
            <p className="text-sm font-bold mb-1">{t("social.overallRatingReport")}</p>
            <p className="text-2xl">{"⭐".repeat(p.evaluationScore)} ({p.evaluationScore}/5)</p>
          </div>
        )}

        {p.evaluationReport && (
          <div className="mb-4">
            <h3 className="text-lg font-bold border-b pb-1 mb-2">{t("social.reportSummaryLabel")}</h3>
            <p className="text-sm whitespace-pre-wrap">{p.evaluationReport}</p>
          </div>
        )}

        {p.evaluationLessons && (
          <div className="mb-4">
            <h3 className="text-lg font-bold border-b pb-1 mb-2">{t("social.lessonsLearnedLabel")}</h3>
            <p className="text-sm whitespace-pre-wrap">{p.evaluationLessons}</p>
          </div>
        )}

        {p.evaluationRecommend && (
          <div className="mb-4">
            <h3 className="text-lg font-bold border-b pb-1 mb-2">{t("social.recommendationsLabel")}</h3>
            <p className="text-sm whitespace-pre-wrap">{p.evaluationRecommend}</p>
          </div>
        )}

        {p.inKindDonations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-bold border-b pb-1 mb-2">{t("social.inKindBreakdownTitle")}</h3>
            <ul className="text-sm list-disc ms-5">
              {p.inKindDonations.map((d, i) => (
                <li key={i}>{d.itemName} — {Number(d.quantity).toString()} {d.unit ?? ""}{d.estimatedValue ? ` (≈ ${Number(d.estimatedValue).toFixed(0)} ${t("social.mad")})` : ""}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 text-xs text-gray-600 border-t pt-3 flex justify-between">
          <span>{t("social.preparedBy", { name: p.creator?.fullName ?? "—" })}</span>
          {p.evaluator && <span>{t("social.evaluatedBy", { name: p.evaluator.fullName, date: p.evaluatedAt?.toISOString().slice(0, 10) ?? "" })}</span>}
        </div>
      </div>
    </div>
  );
}
