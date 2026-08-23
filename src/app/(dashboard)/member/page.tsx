"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";

export default function MemberPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">فضاء المنخرط</h1>
        <p className="text-muted-foreground">الملف الشخصي</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>معلوماتي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">الاسم الكامل</p>
            <p className="font-medium">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">اسم المستخدم</p>
            <p className="font-medium">{user?.username}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الأدوار</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(user?.roles as Role[])?.map((role) => (
                <Badge key={role} variant="secondary">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
