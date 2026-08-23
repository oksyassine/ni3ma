// Coercion helpers that reject NaN before it reaches Prisma/Postgres.
// Use at request entry points where body fields are unknown strings.

/** Parse to finite float or null. Empty string / undefined / null → null. */
export function toFloatOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Parse to finite int or null. */
export function toIntOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Parse to Date or null, treating invalid date strings as null. */
export function toDateOrNull(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}
