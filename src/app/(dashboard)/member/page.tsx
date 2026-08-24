"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { useT } from "@/components/i18n/provider";

export default function MemberPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("member.spaceTitle")}</h1>
        <p className="text-muted-foreground">{t("member.profileSubtitle")}</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("member.myInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("member.fullName")}</p>
            <p className="font-medium">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("member.username")}</p>
            <p className="font-medium">{user?.username}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("member.roles")}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(user?.roles as Role[])?.map((role) => (
                <Badge key={role} variant="secondary">
                  {roleLabel(role, locale === "fr" ? "fr" : "ar")}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
