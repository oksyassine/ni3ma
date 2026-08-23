import Link from "next/link";

const MESSAGES: Record<string, { title: string; body: string }> = {
  pending_provisioning: {
    title: "فضاء جمعيتكم قيد التهيئة",
    body: "نشاطكم قيد الإعداد النهائي. سيتوفر الفضاء خلال ساعات العمل — شكرا لصبركم.",
  },
  provision_failed: {
    title: "تعذّر إتمام تهيئة الفضاء",
    body: "حدث خطأ تقني أثناء تجهيز فضاء الجمعية. فريقنا يعمل على حل المشكل وسيتواصل معكم.",
  },
  suspended: {
    title: "الحساب موقوف مؤقتا",
    body: "توقف الاشتراك أو طلبته الإدارة. يمكنكم تجديد الاشتراك من صفحة الفاتورة لإعادة تفعيل الفضاء فورا، أو التواصل معنا.",
  },
};

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const msg = MESSAGES[status ?? ""] ?? {
    title: "الفضاء غير متاح حاليا",
    body: "تواصلوا مع إدارة المنصة لمزيد من المعلومات.",
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-muted p-4 text-3xl">⏸</div>
      <h1 className="mt-6 text-2xl font-extrabold">{msg.title}</h1>
      <p className="mt-4 text-muted-foreground">{msg.body}</p>
      <Link href="/billing" className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        صفحة الاشتراك والفاتورة
      </Link>
      <Link href="/" className="mt-3 text-sm text-muted-foreground underline">
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
}
