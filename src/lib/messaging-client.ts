// Tiny client-safe copy of the template renderer — the real one lives in
// `lib/messaging.ts` alongside the Prisma client which can't be bundled to
// the browser. Keep these two in sync.
export function renderTemplateClient(
  body: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}
