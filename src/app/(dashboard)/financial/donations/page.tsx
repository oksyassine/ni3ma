"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SECTION_LABELS: Record<string, string> = {
  EDUCATIONAL: "تربوي",
  SOCIAL: "اجتماعي",
  QURAN: "قرآن كريم",
};

type DonationItem = {
  id: string;
  donorName: string | null;
  donorPhone: string | null;
  amount: string;
  section: string;
  isAnonymous: boolean;
  isPaid: boolean;
  pledgedAt: string | null;
  paidAt: string | null;
  donationDate: string;
  notes: string | null;
  project: { name: string } | null;
  recorder: { fullName: string } | null;
};

export default function DonationsPage() {
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    donorName: "",
    donorPhone: "",
    amount: "",
    section: "SOCIAL",
    isAnonymous: false,
    isPledge: false,
    notes: "",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ donorName: "", donorPhone: "", amount: "", section: "SOCIAL", isAnonymous: false, isPledge: false, notes: "" });
  };

  const markPaid = async (id: string) => {
    if (!confirm("تأكيد استلام هذا التبرع؟")) return;
    const r = await fetch(`/api/donations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markPaid: true }),
    });
    if (r.ok) {
      toast.success("تم تأكيد الاستلام");
      fetchDonations();
    } else toast.error("فشل");
  };

  const openEdit = (d: DonationItem) => {
    setEditingId(d.id);
    setForm({
      donorName: d.donorName ?? "",
      donorPhone: d.donorPhone ?? "",
      amount: d.amount,
      section: d.section,
      isAnonymous: d.isAnonymous,
      isPledge: !d.isPaid,
      notes: d.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا التبرع؟")) return;
    const r = await fetch(`/api/donations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      fetchDonations();
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "فشل الحذف");
    }
  };

  const fetchDonations = async () => {
    const res = await fetch("/api/donations");
    const data = await res.json();
    setDonations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) {
      toast.error("المبلغ مطلوب");
      return;
    }
    if (!form.isAnonymous && !form.donorName) {
      toast.error("اسم المتبرع مطلوب أو اختر تبرع مجهول");
      return;
    }

    setSubmitting(true);
    const res = editingId
      ? await fetch(`/api/donations/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/donations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    if (res.ok) {
      toast.success(editingId ? "تم تعديل التبرع" : "تم تسجيل التبرع بنجاح");
      setDialogOpen(false);
      resetForm();
      fetchDonations();
    } else {
      toast.error("حدث خطأ");
    }
    setSubmitting(false);
  };

  const total = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التبرعات</h1>
          <p className="text-muted-foreground">
            الإجمالي: {total.toFixed(2)} درهم
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger>
            <Button>إضافة تبرع</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل التبرع" : "تبرع جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={form.isAnonymous}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isAnonymous: checked as boolean })
                  }
                />
                <Label htmlFor="anonymous" className="cursor-pointer font-normal">
                  تبرع مجهول
                </Label>
              </div>

              {!form.isAnonymous && (
                <>
                  <div className="space-y-2">
                    <Label>اسم المتبرع *</Label>
                    <Input
                      value={form.donorName}
                      onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>هاتف المتبرع</Label>
                    <Input
                      value={form.donorPhone}
                      onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
                      dir="ltr"
                      className="text-right"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>المبلغ (درهم) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  dir="ltr"
                  className="text-right"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v ?? "SOCIAL" })}>
                  <SelectTrigger>
                    <SelectValue>{form.section ? (SECTION_LABELS as Record<string, string>)[form.section] : ""}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                  rows={2}
                />
              </div>

              <label className="flex items-start gap-2 text-sm border rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/10">
                <input
                  type="checkbox"
                  checked={form.isPledge}
                  onChange={(e) => setForm({ ...form, isPledge: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">تبرع موعود (لم يُستلم بعد)</div>
                  <div className="text-xs text-muted-foreground">المبلغ الموعود يظهر منفصلا حتى يتم تأكيد استلامه</div>
                </div>
              </label>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "حفظ التبرع"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>المتبرع</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>المشروع</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead className="w-20">الحالة</TableHead>
              <TableHead className="w-40">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : donations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا توجد تبرعات مسجلة
                </TableCell>
              </TableRow>
            ) : (
              donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{new Date(donation.donationDate).toLocaleDateString("ar-MA")}</TableCell>
                  <TableCell>
                    {donation.isAnonymous ? (
                      <span className="text-muted-foreground italic">مجهول</span>
                    ) : (
                      donation.donorName
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{parseFloat(donation.amount).toFixed(2)} د.م</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{SECTION_LABELS[donation.section]}</Badge>
                  </TableCell>
                  <TableCell>{donation.project?.name ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                    {donation.notes ?? "-"}
                  </TableCell>
                  <TableCell>
                    {donation.isPaid ? (
                      <Badge variant="default" className="text-[10px]">مستلم</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-700">موعود</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!donation.isPaid && (
                        <Button size="sm" variant="default" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => markPaid(donation.id)}>
                          ✓ تأكيد الاستلام
                        </Button>
                      )}
                      <a href={`/financial/donations/${donation.id}/receipt`} target="_blank" rel="noopener noreferrer" title="وصل" className="h-7 w-7 inline-flex items-center justify-center text-xs hover:bg-muted rounded">
                        🧾
                      </a>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(donation)} title="تعديل">
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(donation.id)} title="حذف">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
