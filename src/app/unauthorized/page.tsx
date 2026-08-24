import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function UnauthorizedPage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="text-xl text-muted-foreground">{t("unauthorized.message")}</p>
        <Link href="/">
          <Button>{t("unauthorized.home")}</Button>
        </Link>
      </div>
    </div>
  );
}
