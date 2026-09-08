"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n/provider";

export function ReportToolbar({
  years,
  selectedId,
}: {
  years: { id: string; label: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const { t } = useT();

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Select value={selectedId} onValueChange={(v) => v && router.push(`/bureau/annual-report?year=${v}`)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => window.print()}>
        {t("gov.report.print")}
      </Button>
    </div>
  );
}
