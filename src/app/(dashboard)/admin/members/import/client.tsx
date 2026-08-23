"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertTriangle, Check, Download } from "lucide-react";

type Row = Record<string, string | number | undefined>;
type Preview = {
  total: number;
  valid: number;
  errors: { index: number; reason: string }[];
  preview: Row[];
};

const TEMPLATE_COLS = [
  "fullName", "memberType", "gender", "dateOfBirth", "placeOfBirth",
  "educationalLevel", "address", "phone", "cin", "parentCin",
  "fatherName", "fatherPhone", "motherName", "motherPhone",
  "siblingsCount", "siblingOrder", "healthConditions",
  "profession", "interests", "associationRole",
  "subscriptionAmount", "sections",
];

export function ImportClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importing, setImporting] = useState(false);
  const [filename, setFilename] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Row>(sheet);
    setRows(data);
    setPreview(null);

    // Auto dry run
    const r = await fetch("/api/members/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: data, dryRun: true }),
    });
    if (r.ok) setPreview(await r.json());
    else toast.error("فشل التحقق");
  };

  const confirmImport = async () => {
    setImporting(true);
    const r = await fetch("/api/members/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, dryRun: false }),
    });
    if (r.ok) {
      const data = await r.json();
      toast.success(`تم استيراد ${data.imported} منخرط`);
      setRows([]);
      setPreview(null);
      setFilename("");
    } else toast.error("فشل الاستيراد");
    setImporting(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLS,
      ["محمد العلوي", "CHILD", "MALE", "2015-03-15", "مكناس", "الرابع ابتدائي", "حي السلام", "0612345678", "", "AB123456", "العلوي أحمد", "0612000000", "خديجة", "0612000001", "2", "1", "", "", "", "", "20", "EDUCATIONAL,QURAN"],
      ["فاطمة الزهراء", "ADULT", "FEMALE", "1985-06-20", "فاس", "جامعي", "حي الأمل", "0698765432", "BJ987654", "", "", "", "", "", "", "", "", "أستاذة", "تربية، تعليم", "متطوعة", "50", "SOCIAL"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "ni3ma-import-template.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">استيراد المنخرطين</h1>
          <p className="text-muted-foreground">رفع ملف Excel أو CSV لاستيراد قائمة المنخرطين</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download size={14} />تنزيل النموذج
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload size={18} />رفع الملف</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>ملف Excel أو CSV</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </div>
          {filename && <p className="text-sm text-muted-foreground">📄 {filename} — {rows.length} صف</p>}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>الأعمدة المطلوبة: <code className="bg-muted px-1 rounded">fullName</code>, <code className="bg-muted px-1 rounded">memberType</code> (CHILD/ADULT)</p>
            <p>الأعمدة الاختيارية: gender, dateOfBirth, phone, fatherName, motherName, sections (مفصولة بفاصلة)...</p>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
                  <p className="text-2xl font-bold">{preview.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <Check size={24} className="text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">صالح للاستيراد</p>
                  <p className="text-2xl font-bold text-green-600">{preview.valid}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle size={24} className="text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">أخطاء</p>
                  <p className="text-2xl font-bold text-orange-600">{preview.errors.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {preview.errors.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-orange-700">الأخطاء</CardTitle></CardHeader>
              <CardContent className="space-y-1 max-h-64 overflow-auto">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-sm">
                    <Badge variant="outline">صف {e.index + 2}</Badge>
                    <span className="ms-2">{e.reason}</span>
                  </div>
                ))}
                {preview.errors.length > 50 && (
                  <p className="text-xs text-muted-foreground">... و {preview.errors.length - 50} أخطاء أخرى</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">معاينة (10 صفوف)</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-right">الاسم</th>
                    <th className="p-2 text-right">النوع</th>
                    <th className="p-2 text-right">الجنس</th>
                    <th className="p-2 text-right">الهاتف</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{p.fullName as string}</td>
                      <td className="p-2">{p.memberType as string}</td>
                      <td className="p-2">{(p.gender as string) ?? "—"}</td>
                      <td className="p-2">{(p.phone as string) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Button onClick={confirmImport} disabled={importing || preview.valid === 0} size="lg">
            {importing ? "..." : `تأكيد استيراد ${preview.valid} منخرط`}
          </Button>
        </>
      )}
    </div>
  );
}
