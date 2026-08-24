import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { t } = await getT();
  const known = status === "pending_provisioning" || status === "provision_failed" || status === "suspended";
  const key = known ? status! : "generic";
  const title = t(`suspended.${key}.title`);
  const body = t(`suspended.${key}.body`);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-muted p-4 text-3xl">⏸</div>
      <h1 className="mt-6 text-2xl font-extrabold">{title}</h1>
      <p className="mt-4 text-muted-foreground">{body}</p>
      <Link href="/billing" className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        {t("suspended.cta.billing")}
      </Link>
      <Link href="/" className="mt-3 text-sm text-muted-foreground underline">
        {t("suspended.cta.home")}
      </Link>
    </div>
  );
}
