"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/provider";
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
  const { t } = useT();
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
    else toast.error(t("members.import.validationFailed"));
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
      toast.success(t("members.import.importedToast", { count: data.imported }));
      setRows([]);
      setPreview(null);
      setFilename("");
    } else toast.error(t("members.import.importFailed"));
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
          <h1 className="text-2xl font-bold">{t("members.import.title")}</h1>
          <p className="text-muted-foreground">{t("members.import.desc")}</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download size={14} />{t("members.import.downloadTemplate")}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload size={18} />{t("members.import.uploadFile")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t("members.import.fileLabel")}</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </div>
          {filename && <p className="text-sm text-muted-foreground">📄 {filename} — {t("members.import.rowCount", { count: rows.length })}</p>}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t("members.import.requiredCols")} <code className="bg-muted px-1 rounded">fullName</code>, <code className="bg-muted px-1 rounded">memberType</code> (CHILD/ADULT)</p>
            <p>{t("members.import.optionalCols")} {t("members.import.separatedByComma")}</p>
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
                  <p className="text-xs text-muted-foreground">{t("members.import.statRows")}</p>
                  <p className="text-2xl font-bold">{preview.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <Check size={24} className="text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("members.import.statValid")}</p>
                  <p className="text-2xl font-bold text-green-600">{preview.valid}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle size={24} className="text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("members.import.statErrors")}</p>
                  <p className="text-2xl font-bold text-orange-600">{preview.errors.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {preview.errors.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-orange-700">{t("members.import.errorsTitle")}</CardTitle></CardHeader>
              <CardContent className="space-y-1 max-h-64 overflow-auto">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-sm">
                    <Badge variant="outline">{t("members.import.rowBadge", { row: e.index + 2 })}</Badge>
                    <span className="ms-2">{e.reason}</span>
                  </div>
                ))}
                {preview.errors.length > 50 && (
                  <p className="text-xs text-muted-foreground">{t("members.import.moreErrors", { count: preview.errors.length - 50 })}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">{t("members.import.previewTitle")}</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-right">{t("members.import.thName")}</th>
                    <th className="p-2 text-right">{t("members.col.type")}</th>
                    <th className="p-2 text-right">{t("members.gender")}</th>
                    <th className="p-2 text-right">{t("members.col.phone")}</th>
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
            {importing ? "..." : t("members.import.confirmImport", { count: preview.valid })}
          </Button>
        </>
      )}
    </div>
  );
}
