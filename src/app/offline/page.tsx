import { getT } from "@/lib/i18n/server";
import Link from "next/link";

// Shown by the service worker when a navigation fails and no cached copy exists.
export default async function OfflinePage() {
  const { t, locale } = await getT();
  const ar = locale !== "fr";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-muted p-4 text-3xl">📴</div>
      <h1 className="mt-6 text-2xl font-extrabold">{ar ? "لا يوجد اتصال" : "Hors ligne"}</h1>
      <p className="mt-4 text-muted-foreground">
        {ar
          ? "تعذر تحميل هذه الصفحة. أعد المحاولة عند توفر الاتصال — البيانات المسجلة سابقا محفوظة بأمان."
          : "Impossible de charger cette page. Réessayez une fois reconnecté — les données déjà enregistrées sont en sécurité."}
      </p>
      <Link href="/" className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        {ar ? "إعادة المحاولة" : "Réessayer"}
      </Link>
    </div>
  );
}
