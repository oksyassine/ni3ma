import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      recorder: { select: { fullName: true } },
    },
  });
  if (!donation) return notFound();

  const association = await prisma.associationInfo.findUnique({ where: { id: 1 } });
  const receiptNo = `${donation.donationDate.getFullYear()}-${donation.id.slice(-6).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto bg-white border-2 border-emerald-700 rounded-lg p-8 print:border print:shadow-none shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-emerald-700 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="logo" width={64} height={64} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold">{association?.name ?? "جمعية النعمة"}</h1>
              <p className="text-xs text-gray-600">{association?.address ?? ""}{association?.address && association?.city ? "، " : ""}{association?.city ?? "مكناس"}</p>
              {association?.phone && <p className="text-xs text-gray-600" dir="ltr">📞 {association.phone}</p>}
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-600">رقم الوصل</p>
            <p className="font-mono font-bold text-lg">{receiptNo}</p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center my-6">وصل تبرع</h2>

        {/* Body */}
        <div className="space-y-4 text-base">
          <div className="grid grid-cols-2 gap-4 border rounded p-4 bg-gray-50">
            <div>
              <p className="text-xs text-gray-600">المتبرع</p>
              <p className="font-bold text-lg">{donation.isAnonymous ? "متبرع كريم (مجهول)" : (donation.donorName ?? "—")}</p>
              {!donation.isAnonymous && donation.donorPhone && (
                <p className="text-sm text-gray-700" dir="ltr">{donation.donorPhone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600">التاريخ</p>
              <p className="font-bold">{donation.donationDate.toISOString().slice(0, 10)}</p>
              <p className="text-xs text-gray-600 mt-2">القسم</p>
              <p className="font-medium">{donation.section}</p>
            </div>
          </div>

          <div className="border-2 border-emerald-700 rounded p-6 text-center bg-emerald-50">
            <p className="text-xs text-gray-600 mb-1">المبلغ المتبرع به</p>
            <p className="text-4xl font-bold text-emerald-700">{Number(donation.amount).toFixed(2)} د.م</p>
            <p className="text-xs text-gray-600 mt-2">{numberToArabicWords(Number(donation.amount))} درهما مغربيا</p>
          </div>

          {donation.project && (
            <div>
              <p className="text-xs text-gray-600">المشروع المستفيد</p>
              <p className="font-medium">{donation.project.name}</p>
            </div>
          )}

          {donation.notes && (
            <div>
              <p className="text-xs text-gray-600">ملاحظات</p>
              <p className="text-sm">{donation.notes}</p>
            </div>
          )}

          {!donation.isPaid && (
            <div className="bg-amber-100 border border-amber-300 rounded p-3 text-amber-900 text-sm text-center">
              ⏳ تبرع موعود — لم يُستلم بعد
            </div>
          )}

          <p className="text-sm text-gray-700 leading-relaxed pt-4">
            تشكر {association?.name ?? "جمعية النعمة"} المتبرع الكريم على دعمه السخي،
            وتسأل الله أن يجزيه خير الجزاء وأن يبارك في ماله وأهله.
            هذا الوصل يثبت التبرع المذكور أعلاه.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-12">المتبرع</p>
            <div className="border-t pt-2 text-xs text-gray-600">التوقيع</div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-12">عن الجمعية</p>
            <div className="border-t pt-2 text-xs text-gray-600">الختم والتوقيع</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-gray-500 mt-8 text-center pt-4 border-t">
          {association?.cndpRegistration && <p>CNDP: {association.cndpRegistration}</p>}
          <p>وصل أُنشئ آليا في {new Date().toLocaleDateString("ar-MA")} · {donation.recorder?.fullName ? `سجَّله: ${donation.recorder.fullName}` : ""}</p>
        </div>
      </div>

      <div className="no-print max-w-2xl mx-auto mt-4 flex gap-2 justify-center">
        <button onClick={() => undefined} className="hidden">x</button>
      </div>

      <PrintButton />
    </div>
  );
}

function PrintButton() {
  return (
    <div className="no-print fixed bottom-4 right-4 print:hidden">
      <a href="javascript:window.print()" className="px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-lg hover:bg-emerald-800">
        🖨️ طباعة
      </a>
    </div>
  );
}

// Very minimal Arabic number-to-words for receipts (covers integers up to 9999)
function numberToArabicWords(n: number): string {
  const intPart = Math.floor(n);
  if (intPart === 0) return "صفر";
  if (intPart >= 10000) return intPart.toString();

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  const parts: string[] = [];
  const thousands = Math.floor(intPart / 1000);
  const rest = intPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands < 11) parts.push(`${ones[thousands]} آلاف`);
    else parts.push(`${thousands} ألف`);
  }

  const h = Math.floor(rest / 100);
  const t = Math.floor((rest % 100) / 10);
  const o = rest % 10;
  if (h > 0) parts.push(hundreds[h]);
  if (t === 1) parts.push(teens[o]);
  else {
    if (o > 0) parts.push(ones[o]);
    if (t >= 2) parts.push(tens[t]);
  }

  return parts.filter(Boolean).join(" و ");
}
