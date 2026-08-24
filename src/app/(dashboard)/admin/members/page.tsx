"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n/provider";

type MemberSection = {
  id: string;
  section: string;
  isActive: boolean;
};

type Member = {
  id: string;
  registrationNumber: number;
  memberType: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  registrationDate: string;
  sections: MemberSection[];
};

const SECTION_LABELS: Record<string, string> = {
  EDUCATIONAL: "members.section.EDUCATIONAL",
  SOCIAL: "members.section.SOCIAL",
  QURAN: "members.section.QURAN",
};

export default function MembersPage() {
  const { t } = useT();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (sectionFilter !== "all") params.set("section", sectionFilter);
    params.set("page", page.toString());

    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members);
    setTotal(data.total);
    setLoading(false);
  }, [search, typeFilter, sectionFilter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("members.listTitle")}</h1>
          <p className="text-muted-foreground">{t("members.totalCount", { count: total })}</p>
        </div>
        <Link href="/admin/members/new">
          <Button>{t("members.registerNew")}</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder={t("members.searchPlaceholder")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("members.filterType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("members.all")}</SelectItem>
            <SelectItem value="CHILD">{t("members.children")}</SelectItem>
            <SelectItem value="ADULT">{t("members.adults")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={(v) => { setSectionFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("members.filterSection")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("members.all")}</SelectItem>
            <SelectItem value="EDUCATIONAL">{t("members.section.EDUCATIONAL")}</SelectItem>
            <SelectItem value="SOCIAL">{t("members.section.SOCIAL")}</SelectItem>
            <SelectItem value="QURAN">{t("members.section.QURAN")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("members.col.number")}</TableHead>
              <TableHead>{t("members.col.fullName")}</TableHead>
              <TableHead>{t("members.col.type")}</TableHead>
              <TableHead>{t("members.col.phone")}</TableHead>
              <TableHead>{t("members.col.sections")}</TableHead>
              <TableHead>{t("members.col.status")}</TableHead>
              <TableHead className="w-20">{t("members.col.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {t("members.loading")}
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("members.empty")}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono">{member.registrationNumber}</TableCell>
                  <TableCell className="font-medium">{member.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(`members.type.${member.memberType}`)}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">{member.phone ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {member.sections
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {t(SECTION_LABELS[s.section])}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "default" : "destructive"}>
                      {member.isActive ? t("members.active") : t("members.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/members/${member.id}`}>
                      <Button variant="ghost" size="sm">{t("members.view")}</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("members.prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("members.pageOf", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("members.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
