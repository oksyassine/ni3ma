// CSV export helper. Avoids the need for a heavy dep — handles the common
// pitfalls (commas/quotes/newlines inside fields, BOM for Excel, AR/FR
// locales).
//
// Usage:
//   const csv = toCsv(rows, ["id", "name", { key: "birthDate", header: "Date", format: (v) => v }])
//   return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=foo.csv" } })

export type Column<T> =
  | string
  | {
      key: keyof T | string;
      header?: string;
      format?: (v: unknown, row: T) => string | number | null | undefined;
    };

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Column<T>[],
  opts: { withBom?: boolean; delimiter?: string } = {}
): string {
  const { withBom = true, delimiter = "," } = opts;
  const lines: string[] = [];
  const headers = columns.map((c) => (typeof c === "string" ? c : c.header ?? String(c.key)));
  lines.push(headers.map(escapeCell).join(delimiter));
  for (const row of rows) {
    const cells = columns.map((c) => {
      if (typeof c === "string") return escapeCell(row[c]);
      const value = row[c.key as keyof T];
      const formatted = c.format ? c.format(value, row) : value;
      return escapeCell(formatted);
    });
    lines.push(cells.join(delimiter));
  }
  // RFC 4180 expects \r\n; for Excel/LibreOffice compatibility this is safer.
  return (withBom ? "\uFEFF" : "") + lines.join("\r\n") + "\r\n";
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
