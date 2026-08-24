"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { SECTION_LABELS } from "@/lib/section";
import { useT } from "@/components/i18n/provider";

export function CheckinForm({
  token,
  initialSection,
  initialActivityId,
}: {
  token: string;
  initialSection: string;
  initialActivityId: string;
}) {
  const { t } = useT();
  const [section, setSection] = useState(initialSection);
  const [activityId] = useState(initialActivityId);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; member?: { fullName: string; registrationNumber: number }; error?: string } | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    const r = await fetch("/api/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, section, activityId: activityId || null }),
    });
    const data = await r.json();
    if (r.ok) {
      setResult({ ok: true, member: data.member });
      toast.success(t("token.successToast", { name: data.member.fullName }));
    } else {
      setResult({ ok: false, error: data.error });
      toast.error(data.error ?? t("token.failedToast"));
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("token.formTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && (
            <>
              <p className="text-sm text-muted-foreground">{t("token.memberCode")} <code>{token}</code></p>
              <div>
                <Label>{t("misc.section")}</Label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
                {submitting ? "..." : t("token.submit")}
              </Button>
            </>
          )}
          {result?.ok && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 size={64} className="mx-auto text-green-600" />
              <p className="text-lg font-bold">{result.member?.fullName}</p>
              <p className="text-sm text-muted-foreground">{t("token.regNumber", { number: result.member?.registrationNumber ?? "" })}</p>
              <p className="text-sm text-green-600">{t("token.success")}</p>
              <Button variant="outline" onClick={() => window.history.back()}>{t("token.back")}</Button>
            </div>
          )}
          {result && !result.ok && (
            <div className="text-center space-y-3 py-4">
              <XCircle size={64} className="mx-auto text-red-600" />
              <p className="text-sm text-red-600">{result.error}</p>
              <Button variant="outline" onClick={() => setResult(null)}>{t("token.retry")}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
