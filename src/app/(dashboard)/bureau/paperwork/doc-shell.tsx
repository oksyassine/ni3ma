export const PRINT_CSS =
  '@media print{aside[data-slot="sidebar"],header,.print\\:hidden{display:none !important}main{padding:0 !important}body{-webkit-print-color-adjust:exact}}';

// Shared official-document layout primitives (A4-ish centered sheet).
export function DocSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[820px]">
      <style>{PRINT_CSS}</style>
      <div className="rounded-xl border bg-white text-black shadow-sm print:border-0 print:shadow-none">
        <div className="min-h-[1000px] p-10 sm:p-14">{children}</div>
      </div>
    </div>
  );
}

export function DocHeader({ associationName, city }: { associationName: string; city?: string | null }) {
  return (
    <header className="mb-10 flex items-start justify-between gap-6 border-b pb-4" dir="rtl">
      <div className="text-sm font-semibold leading-relaxed" dir="rtl">
        المملكة المغربية
        <br />
        جمعية: {associationName}
        {city ? (
          <>
            <br />
            {city}
          </>
        ) : null}
      </div>
      <div className="text-left text-sm leading-relaxed" dir="ltr">
        Royaume du Maroc
        <br />
        Association : {associationName}
      </div>
    </header>
  );
}

export function DocFooter({ left, right }: { left: string; right: string }) {
  return (
    <footer className="mt-16 flex items-end justify-between text-sm font-semibold" dir="rtl">
      <div>{right}</div>
      <div>{left}</div>
    </footer>
  );
}
