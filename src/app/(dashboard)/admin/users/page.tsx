"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roleLabel } from "@/lib/rbac";
import { useT } from "@/components/i18n/provider";
import { toast } from "sonner";
import type { Role } from "@/lib/rbac";

type PendingMember = {
  id: string;
  fullName: string;
  memberType: "CHILD" | "ADULT";
  phone: string | null;
  registrationNumber: number;
  createdAt: string;
};

type AdultNoAccess = {
  id: string;
  fullName: string;
  phone: string | null;
  registrationNumber: number;
};

type MemberWithAccess = {
  id: string;
  username: string;
  fullName: string;
  registrationNumber: number;
  userIsActive: boolean;
  roles: Role[];
};

type SystemUser = {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
  roles: Role[];
  createdAt: string;
};

type InviteResult = {
  inviteUrl: string;
  expiresAt: string;
};

export default function UsersPage() {
  const router = useRouter();
  const { t, locale } = useT();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [adultsNoAccess, setAdultsNoAccess] = useState<AdultNoAccess[]>([]);
  const [memberUsers, setMemberUsers] = useState<MemberWithAccess[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    const [pendingRes, noAccessRes, accessRes, usersRes] = await Promise.all([
      fetch("/api/members?pending=1"),
      fetch("/api/members?noAccess=1&limit=200"),
      fetch("/api/members?hasAccess=1"),
      fetch("/api/users"),
    ]);
    const pending = await pendingRes.json();
    const noAccess = await noAccessRes.json();
    const access = await accessRes.json();
    const users = await usersRes.json();

    setPendingMembers(pending.members ?? []);
    setAdultsNoAccess(
      (noAccess.members ?? []).map((m: { id: string; fullName: string; phone: string | null; registrationNumber: number }) => ({
        id: m.id,
        fullName: m.fullName,
        phone: m.phone,
        registrationNumber: m.registrationNumber,
      }))
    );
    setMemberUsers((access as MemberWithAccess[]).filter((m) => m.username));
    setSystemUsers(users.filter((u: SystemUser) => u.isActive));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const approveChild = async (memberId: string) => {
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      toast.success(t("admin.users.toastApproved"));
      fetchData();
    } else {
      toast.error(t("admin.error"));
    }
  };

  const approveAdultWithInvite = async (memberId: string) => {
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      setInviteResult(data);
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error ?? t("admin.error"));
    }
  };

  const rejectMember = async (memberId: string) => {
    if (!confirm(t("admin.users.confirmReject"))) return;
    const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("admin.users.toastRejected"));
      fetchData();
    } else {
      toast.error(t("admin.error"));
    }
  };

  const sendNewInvite = async (memberId: string) => {
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      setInviteResult(data);
    } else {
      const data = await res.json();
      toast.error(data.error ?? t("admin.error"));
    }
  };

  const copyLink = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.users.title")}</h1>
        <p className="text-muted-foreground">
          {t("admin.users.subtitle")}
        </p>
      </div>

      {/* Pending registrations */}
      {!loading && pendingMembers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
              {t("admin.users.pendingCount", { count: pendingMembers.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border flex-wrap gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.fullName}</p>
                      <Badge variant={m.memberType === "CHILD" ? "secondary" : "default"} className="text-xs">
                        {m.memberType === "CHILD" ? t("admin.users.childBadge") : t("admin.users.adultBadge")}
                      </Badge>
                    </div>
                    {m.phone && (
                      <p className="text-sm text-muted-foreground" dir="ltr">{m.phone}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {m.memberType === "CHILD" ? (
                      <Button size="sm" onClick={() => approveChild(m.id)}>
                        {t("admin.users.approve")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => approveAdultWithInvite(m.id)}>
                        {t("admin.users.approveInvite")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMember(m.id)}
                    >
                      {t("admin.users.reject")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved adults without login credentials yet */}
      {!loading && adultsNoAccess.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/10 dark:border-blue-900/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" />
              {t("admin.users.adultsNoAccessCount", { count: adultsNoAccess.length })}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {t("admin.users.adultsNoAccessDesc")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adultsNoAccess.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border flex-wrap gap-3"
                >
                  <div>
                    <p className="font-medium">
                      {m.fullName}
                      <span className="text-muted-foreground text-xs mr-1.5">#{m.registrationNumber}</span>
                    </p>
                    {m.phone && (
                      <p className="text-sm text-muted-foreground" dir="ltr">{m.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => sendNewInvite(m.id)}>
                      {t("admin.users.sendInvite")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/members/${m.id}/edit`)}
                    >
                      {t("admin.users.edit")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members with login access */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("admin.users.memberUsersHeading")}</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">{t("admin.loading")}</p>
        ) : memberUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {t("admin.users.emptyMembers")}
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.users.colName")}</TableHead>
                  <TableHead>{t("admin.users.colUsername")}</TableHead>
                  <TableHead>{t("admin.users.colRoles")}</TableHead>
                  <TableHead>{t("admin.users.colStatus")}</TableHead>
                  <TableHead className="w-32">{t("admin.users.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberUsers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.fullName}
                      <span className="text-muted-foreground text-xs mr-1.5">
                        #{m.registrationNumber}
                      </span>
                    </TableCell>
                    <TableCell dir="ltr" className="text-right text-sm">{m.username}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {m.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {roleLabel(role, locale as "ar" | "fr")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.userIsActive ? "default" : "secondary"}>
                        {m.userIsActive ? t("admin.users.active") : t("admin.users.disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => router.push(`/admin/members/${m.id}/edit`)}
                        >
                          {t("admin.users.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => sendNewInvite(m.id)}
                          title={t("admin.users.sendNewInviteTitle")}
                        >
                          🔗
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* System accounts */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("admin.users.systemAccounts")}</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.users.colName")}</TableHead>
                <TableHead>{t("admin.users.colUsername")}</TableHead>
                <TableHead>{t("admin.users.colRoles")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6">{t("admin.loading")}</TableCell>
                </TableRow>
              ) : (
                systemUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell dir="ltr" className="text-right text-sm">{u.username}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs">
                            {roleLabel(r, locale as "ar" | "fr")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Invite link dialog */}
      <Dialog open={!!inviteResult} onOpenChange={() => { setInviteResult(null); setCopied(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.users.inviteDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.users.inviteDialogDesc")}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border text-sm font-mono break-all" dir="ltr">
              {inviteResult?.inviteUrl}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={copyLink}>
                {copied ? t("admin.users.copied") : t("admin.users.copyLink")}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setInviteResult(null); setCopied(false); }}
              >
                {t("admin.users.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
