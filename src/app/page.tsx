import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultDashboard } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
// Server component: cannot call client-side buttonVariants(); use plain classes.
const BTN = "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
const BTN_OUTLINE = "inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted";

const FEATURES = [
  {
    title: "الأعضاء والعائلات",
    desc: "ملفات كاملة للأعضاء الكبار والصغار، ربط الوالدين بالأبناء، صور وشارات، واستيراد من Excel.",
  },
  {
    title: "الحضور ببطاقة QR",
    desc: "تسجيل الحضور بمسح البطاقة في ثوانٍ، تنبيه غياب المنخرطين، وإحصائيات فورية لكل قسم.",
  },
  {
    title: "المالية والتتبع",
    desc: "الاشتراكات الأسبوعية، التبرعات النقدية والعينية، المصاريف مع الوصولات، وتقارير مالية جاهزة للتصدير.",
  },
  {
    title: "المشاريع والحالات الاجتماعية",
    desc: "مشاريع بأنشطة ومهام وميزانيات ومخاطر، تتبع المستفيدين والأيتام وأدواتهم الصحية والمدرسية.",
  },
  {
    title: "تتبع الحفظ والتجويد",
    desc: "متابعة تقدم الحفظ سورة بسورة وحزب بحزب، تقييم التجويد وفق قواعده، مع تقارير أسبوعية وشهرية.",
  },
  {
    title: "صلاحيات دقيقة",
    desc: "أدوار ومستويات وصول لكل قسم وباب، سجل تدقيق لكل عملية، وحماية كاملة لبيانات جمعيتكم.",
  },
];

const PLANS = [
  {
    name: "مجاني",
    price: "0 درهم",
    period: "للأبد",
    highlight: false,
    features: [
      "حتى 50 منخرطا",
      "مدير واحد + حسابات الأقسام الأساسية",
      "الأعضاء، الحضور بالـQR، الاشتراكات",
      "لوحات القسم التربوي والاجتماعي والقرآني",
      "نسخ احتياطي يومي",
    ],
    cta: "ابدأ مجانا",
    href: "/start",
  },
  {
    name: "أساسي",
    price: "99 درهم",
    period: "شهريا",
    highlight: true,
    features: [
      "حتى 300 منخرط",
      "تنبيهات أولياء الأمور",
      "تتبع الحفظ والتجويد الكامل",
      "المشاريع والحالات الاجتماعية",
      "تصدير التقارير المالية والإدارية",
      "دعم عبر البريد خلال 24 ساعة",
    ],
    cta: "جرّب 14 يوما مجانا",
    href: "/start",
  },
  {
    name: "متقدم",
    price: "199 درهم",
    period: "شهريا",
    highlight: false,
    features: [
      "منخرطون بلا حدود",
      "صفحات عمومية شفافة لمشاريعكم",
      "نطاق خاص your-association.ma",
      "لوحة متعددة الفروع أو الفيدراليات",
      "دعم ذو أولوية",
    ],
    cta: "جرّب 14 يوما مجانا",
    href: "/start",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    redirect(getDefaultDashboard(session.user.roles as Role[]));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold">منصة نعمة</span>
          <nav className="flex items-center gap-2">
            <a href="#pricing" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">الأسعار</a>
            <Link href="/login" className={BTN_OUTLINE}>دخول</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
          سيّروا جمعيتكم كاملة من منصة واحدة
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          الأعضاء، الحضور، المالية، المشاريع، والحالات الاجتماعية — نظام إدارة
          عربي مصمَّم للجمعيات المغربية ودور حفظ القرآن، بأسعار في متناول الجميع.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/start" className={BTN}>أنشئوا فضاء جمعيتكم مجانا</Link>
          <a href="#features" className={BTN_OUTLINE}>اكتشفوا الميزات</a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          بدون بطاقة بنكية — 14 يوما تجربة كاملة للخطة المدفوعة
        </p>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">كل ما تحتاجه الجمعية في مكان واحد</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">أسعار بسيطة وشفافة</h2>
          <p className="mt-3 text-center text-muted-foreground">
            ادفعوا شهريا أو سنويا (شهران مجانا). يمكنكم الترقية أو إلغاء التفعيل في أي وقت.
          </p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border bg-card p-8 shadow-sm ${
                  plan.highlight ? "ring-2 ring-primary relative" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    الأكثر اختيارا
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-extrabold">{plan.price}</span>{" "}
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`${plan.highlight ? BTN : BTN_OUTLINE} mt-8 w-full`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            فيدرالية أو شبكة مساجد؟ تواصلوا معنا للحصول على عرض خاص.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">منصة نعمة</span>
          <span>© {new Date().getFullYear()} — جميع الحقوق محفوظة</span>
        </div>
      </footer>
    </div>
  );
}
