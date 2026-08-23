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
  EDUCATIONAL: "تربوي",
  SOCIAL: "اجتماعي",
  QURAN: "قرآن كريم",
};

const TYPE_LABELS: Record<string, string> = {
  CHILD: "طفل",
  ADULT: "كبير",
};

export default function MembersPage() {
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
          <h1 className="text-2xl font-bold">المنخرطين</h1>
          <p className="text-muted-foreground">إجمالي: {total} منخرط</p>
        </div>
        <Link href="/admin/members/new">
          <Button>تسجيل منخرط جديد</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="CHILD">أطفال</SelectItem>
            <SelectItem value="ADULT">كبار</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={(v) => { setSectionFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="EDUCATIONAL">تربوي</SelectItem>
            <SelectItem value="SOCIAL">اجتماعي</SelectItem>
            <SelectItem value="QURAN">قرآن كريم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">الرقم</TableHead>
              <TableHead>الاسم الكامل</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الأقسام</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-20">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا يوجد منخرطين
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono">{member.registrationNumber}</TableCell>
                  <TableCell className="font-medium">{member.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TYPE_LABELS[member.memberType]}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">{member.phone ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {member.sections
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {SECTION_LABELS[s.section]}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "default" : "destructive"}>
                      {member.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/members/${member.id}`}>
                      <Button variant="ghost" size="sm">عرض</Button>
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
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
