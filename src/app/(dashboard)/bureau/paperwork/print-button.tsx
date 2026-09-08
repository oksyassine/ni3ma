"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label?: string }) {
  return (
    <div className="flex justify-end gap-2 mb-4 print:hidden">
      <Button variant="outline" onClick={() => window.history.back()}>
        ←
      </Button>
      <Button onClick={() => window.print()}>{label ?? "🖨️"}</Button>
    </div>
  );
}
