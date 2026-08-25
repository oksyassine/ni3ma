"use client";

// Print trigger for the (server-rendered) annual report page.
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      {label} / PDF
    </button>
  );
}
